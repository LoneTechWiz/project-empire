import { Jimp } from 'jimp'
import { mkdir } from 'fs/promises'

const img = await Jimp.read('public/img/icons.png')
const crop = (x, y, w, h) => img.clone().crop({ x, y, w, h })

await mkdir('public/img/icons/improvements', { recursive: true })
await mkdir('public/img/icons/resources',    { recursive: true })
await mkdir('public/img/icons/military',     { recursive: true })
await mkdir('public/img/art',                { recursive: true })

// Row 1 — production improvements (y=25 skips the "City Improvement Icons" label text)
// L→R: coal plant, nuclear, wind farm, coal mine, oil refinery, steel mill, munitions, hospital
const imp1 = ['impCoalpower','impNuclearpower','impWindpower','impCoalmine',
               'impOilrefinery','impSteelmill','impMunitionsfactory','impHospital']
for (let i = 0; i < 8; i++)
  await crop(i*176, 25, 176, 165).write(`public/img/icons/improvements/${imp1[i]}.png`)

// Row 2 — commerce improvements (y=192, skip position 4 which is an ambiguous escalator)
// L→R: subway, police, recycling, supermarket, [skip], mall, stadium, bank
const imp2 = {
  0: 'impSubway', 1: 'impPolicestation', 2: 'impRecyclingcenter',
  3: 'impSupermarket', 5: 'impMall', 6: 'impStadium', 7: 'impBank'
}
for (const [i, name] of Object.entries(imp2))
  await crop(i*176, 192, 176, 106).write(`public/img/icons/improvements/${name}.png`)

// Resource icons (y=318 skips "Resource Icons" label text)
// L→R: coal, oil, iron, bauxite, lead, uranium, gasoline, munitions, steel, aluminum, food
const resources = ['coal','oil','iron','bauxite','lead',
                   'uranium','gasoline','munitions','steel','aluminum','food']
for (let i = 0; i < 11; i++)
  await crop(i*128, 318, 128, 62).write(`public/img/icons/resources/${resources[i]}.png`)

// Military icons — icons start at x=154 (label column offset), 179px each
// Verified: at x=150 shows soldier+tank split cleanly in 250px crop
// L→R: soldiers, tanks, aircraft, ships, spies, missiles, nukes
const military = ['soldiers','tanks','aircraft','ships','spies','missiles','nukes']
for (let i = 0; i < 7; i++)
  await crop(154 + i*179, 415, 170, 125).write(`public/img/icons/military/${military[i]}.png`)

// Scene art (y=565 is where image content begins below the label)
await crop(0,   565, 470, 200).write('public/img/art/battle.png')
await crop(470, 565, 469, 200).write('public/img/art/diplomacy.png')
await crop(939, 565, 469, 200).write('public/img/art/spy.png')

console.log('All icons extracted.')
