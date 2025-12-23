# @conference-kit/signaling-server

A lightweight Bun WebSocket signaling server for conferencing: presence, mesh signaling, broadcasts, waiting rooms, and host controls for admits/rejects and raised hands.

## Install & run

```bash
npm install
npm run dev           # bun run src/index.ts
# or build
npm run build         # outputs dist/index.js
```

Defaults: binds `ws://0.0.0.0:8787`.

## Connecting clients

Clients connect via WebSocket query params:

- `peerId` (required): unique ID for the peer.
- `room` (optional): room namespace for presence and broadcasts.
- `host=1` (optional): mark this peer as host (receives waiting list + control signals).
- `waitingRoom=1` (optional): non-hosts wait for host admission when enabled.

## Messages

- `presence`: broadcast to room on join/leave with `peers` roster.
- `signal`: relay payloads between peers (`{type:"signal", to, data}` inbound → `{type:"signal", from, data}` outbound).
- `broadcast`: room-wide app messages (`{type:"broadcast", data}` inbound → `{type:"broadcast", from, room, data}` outbound).
- `control`: server-mediated actions:
  - hosts send `{action:"admit", data:{peerId}}` or `{action:"reject", data:{peerId}}`.
  - everyone can raise/lower hands: `{action:"raise-hand"}` or `{action:"hand-lowered"}` routed to hosts.
  - server notifies hosts with `{action:"waiting-list", data:{waiting:string[]}}` and notifies peers with `{action:"waiting"|"admitted"|"rejected"}`.

## Waiting room flow

1. Non-host connects with `waitingRoom=1`; server enqueues and sends them `waiting`.
2. Hosts in the same room receive `waiting-list` snapshots.
3. Host sends `admit` or `reject`.
4. Admit: peer is subscribed to the room, gets a `presence` join, and the host list updates. Reject: peer receives `rejected` and the socket closes.

## Topology

- Presence and broadcasts are room-scoped (`room:<name>` topics).
- Signals are peer-scoped (`peer:<peerId>` topics).
- State is kept in memory maps (`roomMembers`, `waitingRooms`, `clients`).

## Customizing

- Update `HOST`/`PORT` in `src/index.ts` if you need a different bind.
- Extend the `control` switch to add new server-mediated actions as needed.
