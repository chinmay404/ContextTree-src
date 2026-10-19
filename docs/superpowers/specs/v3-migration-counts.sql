-- Read-only counts the owner runs on prod before switching V3 on (spec §8).
-- They show how much V2 data lives only inside the canvases.data blob. Nothing here writes.

-- 1. Canvases, and canvases whose title exists only in the blob
select count(*) as canvases,
       count(*) filter (where coalesce(data->>'title', '') <> '') as with_blob_title
from canvases;

-- 2. Nodes embedded in the blob that have no nodes row
select count(*) as blob_only_nodes
from canvases c, jsonb_array_elements(coalesce(c.data->'nodes', '[]'::jsonb)) n
where not exists (select 1 from nodes x where x.id = n->>'_id');

-- 3. Edges embedded in the blob that have no edges row
select count(*) as blob_only_edges
from canvases c, jsonb_array_elements(coalesce(c.data->'edges', '[]'::jsonb)) e
where not exists (select 1 from edges x where x.id = e->>'_id');

-- 4. Nodes whose messages exist only in the blob (embedded chatMessages, no message rows)
select count(*) as nodes_with_blob_only_messages
from canvases c, jsonb_array_elements(coalesce(c.data->'nodes', '[]'::jsonb)) n
where jsonb_array_length(coalesce(n->'chatMessages', '[]'::jsonb)) > 0
  and not exists (select 1 from messages m where m.node_id = n->>'_id');

-- 5. Canvases with a canvas note
select count(*) as canvases_with_note
from canvases where coalesce(data->'note'->>'content', '') <> '';

-- 6. Nodes with a saved position (V2 layout route)
select count(*) as nodes_with_position from nodes where data ? 'position';
