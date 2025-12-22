import {
  PeerConfig,
  PeerControls,
  PeerEventHandler,
  PeerEvents,
  PeerSide,
  SignalData,
} from "./types";

// Minimal typed event emitter to avoid external deps
class Emitter {
  private listeners = new Map<keyof PeerEvents, Set<PeerEventHandler<any>>>();

  on<K extends keyof PeerEvents>(event: K, handler: PeerEventHandler<K>) {
    const set = this.listeners.get(event) ?? new Set();
    set.add(handler as PeerEventHandler<any>);
    this.listeners.set(event, set);
  }

  off<K extends keyof PeerEvents>(event: K, handler: PeerEventHandler<K>) {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(handler as PeerEventHandler<any>);
    if (set.size === 0) this.listeners.delete(event);
  }

  once<K extends keyof PeerEvents>(event: K, handler: PeerEventHandler<K>) {
    const wrapped = (payload: PeerEvents[K]) => {
      this.off(event, wrapped as PeerEventHandler<K>);
      handler(payload);
    };
    this.on(event, wrapped as PeerEventHandler<K>);
  }

  emit<K extends keyof PeerEvents>(event: K, payload: PeerEvents[K]) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of Array.from(set)) {
      handler(payload);
    }
  }
}

export class Peer implements PeerControls {
  private pc: RTCPeerConnection;
  private dataChannel?: RTCDataChannel;
  private emitter = new Emitter();
  private destroyed = false;
  private side: PeerSide;
  private trickle: boolean;
  private makingOffer = false;
  private negotiationPending = false;

  constructor({
    side,
    stream,
    config,
    channelLabel = "data",
    trickle = true,
  }: PeerConfig) {
    this.side = side;
    this.trickle = trickle;
    this.pc = new RTCPeerConnection(config);

    if (stream) {
      for (const track of stream.getTracks()) {
        this.pc.addTrack(track, stream);
      }
    }

    if (side === "initiator") {
      this.dataChannel = this.pc.createDataChannel(channelLabel);
      this.wireDataChannel(this.dataChannel);
    } else {
      this.pc.addEventListener("datachannel", (event) => {
        this.dataChannel = event.channel;
        this.wireDataChannel(this.dataChannel);
      });
    }

    this.pc.addEventListener("track", (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) this.emitter.emit("stream", remoteStream);
      this.emitter.emit("track", event.track);
    });

    this.pc.addEventListener("icecandidate", ({ candidate }) => {
      if (candidate && this.trickle) {
        this.emitter.emit("signal", candidate.toJSON());
      }
    });

    this.pc.addEventListener("iceconnectionstatechange", () => {
      this.emitter.emit("iceStateChange", this.pc.iceConnectionState);
    });

    this.pc.addEventListener("connectionstatechange", () => {
      this.emitter.emit("connectionStateChange", this.pc.connectionState);
      if (this.pc.connectionState === "connected")
        this.emitter.emit("connect", undefined);
      if (
        this.pc.connectionState === "failed" ||
        this.pc.connectionState === "disconnected" ||
        this.pc.connectionState === "closed"
      ) {
        this.emitter.emit("close", undefined);
      }
    });

    this.pc.addEventListener("signalingstatechange", () => {
      if (
        this.side === "initiator" &&
        this.pc.signalingState === "stable" &&
        this.negotiationPending
      ) {
        this.negotiationPending = false;
        void this.createOffer();
      }
    });

    this.pc.addEventListener("negotiationneeded", () => {
      if (this.side !== "initiator") return;
      if (this.destroyed) return;
      if (this.makingOffer) {
        this.negotiationPending = true;
        return;
      }
      if (this.pc.signalingState !== "stable") {
        this.negotiationPending = true;
        return;
      }
      void this.createOffer();
    });

    if (this.side === "initiator") {
      void this.createOffer();
    }
  }

  on = this.emitter.on.bind(this.emitter);
  off = this.emitter.off.bind(this.emitter);
  once = this.emitter.once.bind(this.emitter);

  addStream(stream: MediaStream) {
    stream.getTracks().forEach((track) => this.pc.addTrack(track, stream));
  }

  removeStream(stream: MediaStream) {
    for (const sender of this.pc.getSenders()) {
      if (sender.track && stream.getTracks().includes(sender.track)) {
        this.pc.removeTrack(sender);
      }
    }
  }

  addTrack(track: MediaStreamTrack, stream: MediaStream) {
    this.pc.addTrack(track, stream);
  }

  removeTrack(sender: RTCRtpSender) {
    this.pc.removeTrack(sender);
  }

  replaceTrack(
    oldTrack: MediaStreamTrack,
    newTrack: MediaStreamTrack,
    stream: MediaStream
  ) {
    const sender = this.pc.getSenders().find((s) => s.track === oldTrack);
    if (sender) {
      sender.replaceTrack(newTrack);
    } else {
      this.pc.addTrack(newTrack, stream);
    }
  }

  async signal(data: SignalData) {
    if (this.destroyed) return;
    try {
      if ("type" in data) {
        const description = new RTCSessionDescription(data);
        await this.pc.setRemoteDescription(description);

        if (description.type === "offer") {
          await this.createAnswer();
        }
      } else {
        const candidate = new RTCIceCandidate(data);
        await this.pc.addIceCandidate(candidate);
      }
    } catch (error) {
      this.emitter.emit("error", error as Error);
    }
  }

  send(data: string | ArrayBufferView | ArrayBuffer | Blob) {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") {
      throw new Error("Data channel is not open");
    }
    this.dataChannel.send(data as any);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.dataChannel?.close();
    this.pc.getSenders().forEach((sender) => {
      try {
        sender.track?.stop();
      } catch {}
    });
    this.pc.getReceivers().forEach((receiver) => {
      try {
        receiver.track.stop();
      } catch {}
    });
    this.pc.close();
    this.emitter.emit("close", undefined);
  }

  getConnectionState(): RTCPeerConnectionState {
    return this.pc.connectionState;
  }

  private wireDataChannel(channel: RTCDataChannel) {
    channel.addEventListener("open", () => {
      // Mark data channel ready regardless of current connectionState to ensure downstream hooks know it's usable.
      this.emitter.emit("connect", undefined);
    });

    channel.addEventListener("message", (event) => {
      this.emitter.emit("data", event.data);
    });

    channel.addEventListener("close", () => {
      this.emitter.emit("close", undefined);
    });

    channel.addEventListener("error", (event) => {
      const err =
        event instanceof Error ? event : new Error("Data channel error");
      this.emitter.emit("error", err);
    });
  }

  private async createOffer() {
    if (this.destroyed) return;
    try {
      this.makingOffer = true;
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      if (this.pc.localDescription) {
        this.emitter.emit("signal", this.pc.localDescription.toJSON());
      }
    } catch (error) {
      this.emitter.emit("error", error as Error);
    } finally {
      this.makingOffer = false;
    }
  }

  private async createAnswer() {
    if (this.destroyed) return;
    try {
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      if (this.pc.localDescription) {
        this.emitter.emit("signal", this.pc.localDescription.toJSON());
      }
    } catch (error) {
      this.emitter.emit("error", error as Error);
    }
  }
}

export default Peer;
