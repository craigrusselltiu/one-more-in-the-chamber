with refunds as (
  select
    mp.player_id,
    sum(
      case tile
        when 'loot' then 2000
        when 'hourglass' then 2000
        when 'milk' then 2000
        when 'axe' then 3000
        when 'mace' then 3000
        when 'cactus' then 3000
        when 'nunchucks' then 3000
        when 'chainsaw' then 3000
        when 'jackhammer' then 5000
        when 'sacrificial_blade' then 5000
        else 0
      end
    ) as refund
  from meta_progression mp
  cross join unnest(coalesce(mp.unlocked_tiles, '{}')) as tile
  where tile in (
    'loot', 'hourglass', 'milk',
    'axe', 'mace', 'cactus', 'nunchucks', 'chainsaw',
    'jackhammer', 'sacrificial_blade'
  )
  group by mp.player_id
)
update meta_progression mp
set
  reputation = mp.reputation + refunds.refund,
  updated_at = now()
from refunds
where mp.player_id = refunds.player_id;
