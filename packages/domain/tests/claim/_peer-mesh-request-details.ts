// Story 6.27c — every value the ONE `detail` builder can produce (a shared fixture: the pure test holds it against the JS pattern,
// the live spec against 0166's CHECK).

import {
  PEER_MESH_REQUEST_PRE_SEND_FAULTS,
  PEER_MESH_REQUEST_RECHECK_REASONS,
  PEER_MESH_REQUEST_SEND_CONFIG_DETAILS,
  PEER_MESH_REQUEST_SMS_ERROR_CLASSES,
  peerMeshRequestDetail,
} from '../../src/claim/peer-mesh-request.js';
import { PEER_MESH_REQUEST_NAME_REASONS, PEER_MESH_REQUEST_REPLACEABLE_REASONS } from '../../src/schema/claim_peer_mesh_pings.js';

/** Every value the ONE builder can produce from its fixed inputs (the `send` arm sampled over the core's raw forms). */
export function everyBuiltPeerMeshRequestDetail(): string[] {
  return [
    ...PEER_MESH_REQUEST_REPLACEABLE_REASONS.map((reason) => peerMeshRequestDetail({ kind: 'no_target', reason })),
    ...PEER_MESH_REQUEST_NAME_REASONS.map((reason) => peerMeshRequestDetail({ kind: 'no_target', reason })),
    peerMeshRequestDetail({ kind: 'superseded' }),
    peerMeshRequestDetail({ kind: 'exhausted_three_days' }),
    ...PEER_MESH_REQUEST_RECHECK_REASONS.map((reason) => peerMeshRequestDetail({ kind: 'recheck', reason })),
    ...PEER_MESH_REQUEST_PRE_SEND_FAULTS.map((fault) => peerMeshRequestDetail({ kind: 'pre_send', fault })),
    ...PEER_MESH_REQUEST_SEND_CONFIG_DETAILS.map((detail) => peerMeshRequestDetail({ kind: 'send', detail })),
    ...PEER_MESH_REQUEST_SMS_ERROR_CLASSES.flatMap((cls) =>
      [`${cls}:E003`, `${cls}:http_503`, `${cls}:+919876543210`, `${cls}:9876543210`, `${cls}:a b`, cls].map((detail) =>
        peerMeshRequestDetail({ kind: 'send', detail }),
      ),
    ),
    ...['PERMISSION_DENIED', 'grpc_99', 'a b', '9876543210'].map((n) => peerMeshRequestDetail({ kind: 'send', detail: `config:secret_manager_${n}` })),
    peerMeshRequestDetail({ kind: 'send', detail: 'Message rejected for 9876543210' }),
    peerMeshRequestDetail({ kind: 'send', detail: '' }),
  ];
}
