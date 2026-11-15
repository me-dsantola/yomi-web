import type { MangaDexWork } from './types';

function makeProxyCover(mangaId: string, fileName: string, highRes: boolean): string {
  const suffix = highRes ? '.512.jpg' : '.256.jpg';
  const raw = `https://uploads.mangadex.org/covers/${mangaId}/${fileName}${suffix}`;
  return `/api/cover?url=${encodeURIComponent(raw)}`;
}

export const CURATED_POPULAR_WORKS: MangaDexWork[] = [
  {
    id: '32d76d19-8a05-4db0-9fc2-e0b0648fe9d0',
    title: 'Solo Leveling',
    altTitle: 'Na Honjaman Level-Up',
    description:
      'Há dez anos, portais misteriosos conectaram nosso mundo a dimensões repletas de monstros. Sung Jin-Woo, conhecido como o caçador mais fraco da humanidade, desperta um sistema secreto capaz de evoluir seus poderes sem limites.',
    status: 'completed',
    year: 2018,
    contentRating: 'safe',
    tags: [
      { id: '391b0423-d847-456f-aff0-8b0cfc03066b', name: 'Ação' },
      { id: '3e2b8dae-350e-4ab8-a8ce-016e844b9f0d', name: 'Webtoon' },
      { id: 'cdc58593-87dd-415e-bbc0-2ec27bf404cc', name: 'Fantasia' },
    ],
    author: 'Chugong / DUBU',
    artist: 'DUBU (REDICE Studio)',
    coverFileName: 'e90bdc47-c8b9-4df7-b2c0-17641b645ee1.jpg',
    coverUrl: makeProxyCover('32d76d19-8a05-4db0-9fc2-e0b0648fe9d0', 'e90bdc47-c8b9-4df7-b2c0-17641b645ee1.jpg', false),
    coverHighResUrl: makeProxyCover('32d76d19-8a05-4db0-9fc2-e0b0648fe9d0', 'e90bdc47-c8b9-4df7-b2c0-17641b645ee1.jpg', true),
    accentColor: '#8B5CF6',
    featuredChapterLabel: 'Cap. 200 • Completo',
  },
  {
    id: '801513ba-a712-498c-8f57-cae55b38cc92',
    title: 'Berserk',
    description:
      'Em um mundo medieval brutal governado por forças demoníacas e ambições humanas, Guts, o Espadachim Negro, carrega uma espada colossal e uma marca amaldiçoada em busca de vingança e redenção.',
    status: 'ongoing',
    year: 1989,
    contentRating: 'suggestive',
    tags: [
      { id: '391b0423-d847-456f-aff0-8b0cfc03066b', name: 'Ação' },
      { id: 'b9af3a63-f058-46de-a9a0-e0c13906197a', name: 'Drama' },
      { id: 'cdc58593-87dd-415e-bbc0-2ec27bf404cc', name: 'Fantasia Sombria' },
    ],
    author: 'Miura Kentarou',
    artist: 'Miura Kentarou',
    coverFileName: '81e1c82d-6672-400c-8c58-4ff9bfb89031.jpg',
    coverUrl: makeProxyCover('801513ba-a712-498c-8f57-cae55b38cc92', '81e1c82d-6672-400c-8c58-4ff9bfb89031.jpg', false),
    coverHighResUrl: makeProxyCover('801513ba-a712-498c-8f57-cae55b38cc92', '81e1c82d-6672-400c-8c58-4ff9bfb89031.jpg', true),
    accentColor: '#FF2A55',
    featuredChapterLabel: 'Cap. 376 • Seinen',
  },
  {
    id: 'a1c7c817-4e59-43b7-9365-09675a149a6f',
    title: 'One Piece',
    description:
      'Monkey D. Luffy zarpa pelos mares perigosos da Grand Line ao lado dos Piratas do Chapéu de Palha em busca do lendário tesouro One Piece para se tornar o Rei dos Piratas.',
    status: 'ongoing',
    year: 1997,
    contentRating: 'safe',
    tags: [
      { id: '87cc87cd-a395-47af-b27a-93258283bbc6', name: 'Aventura' },
      { id: '391b0423-d847-456f-aff0-8b0cfc03066b', name: 'Ação' },
      { id: '4d32cc48-9f00-4cca-9b5a-a839f0764984', name: 'Comédia' },
    ],
    author: 'Oda Eiichirou',
    artist: 'Oda Eiichirou',
    coverFileName: '2f4aca53-64c7-46ac-ae85-3bc9b3169890.png',
    coverUrl: makeProxyCover('a1c7c817-4e59-43b7-9365-09675a149a6f', '2f4aca53-64c7-46ac-ae85-3bc9b3169890.png', false),
    coverHighResUrl: makeProxyCover('a1c7c817-4e59-43b7-9365-09675a149a6f', '2f4aca53-64c7-46ac-ae85-3bc9b3169890.png', true),
    accentColor: '#F59E0B',
    featuredChapterLabel: 'Cap. 1130+ • Aventura',
  },
  {
    id: 'a77742b1-befd-49a4-bff5-1ad4e6b0ef7b',
    title: 'Chainsaw Man',
    description:
      'Para pagar uma dívida impagável, Denji trabalha como caçador de demônios ao lado de Pochita. Após uma traição brutal, os dois se fundem, dando origem ao temido Homem-Motosserra.',
    status: 'ongoing',
    year: 2018,
    contentRating: 'suggestive',
    tags: [
      { id: '391b0423-d847-456f-aff0-8b0cfc03066b', name: 'Ação' },
      { id: 'eabc5b4c-6aff-42f3-b657-3e90cbd00b75', name: 'Sobrenatural' },
      { id: 'cdad7e68-1419-41dd-bdce-27753074a640', name: 'Terror' },
    ],
    author: 'Fujimoto Tatsuki',
    artist: 'Fujimoto Tatsuki',
    coverFileName: '6e518bd1-5f60-446b-8832-bfe6bf74834b.jpg',
    coverUrl: makeProxyCover('a77742b1-befd-49a4-bff5-1ad4e6b0ef7b', '6e518bd1-5f60-446b-8832-bfe6bf74834b.jpg', false),
    coverHighResUrl: makeProxyCover('a77742b1-befd-49a4-bff5-1ad4e6b0ef7b', '6e518bd1-5f60-446b-8832-bfe6bf74834b.jpg', true),
    accentColor: '#FF2A55',
    featuredChapterLabel: 'Cap. 180+ • Ação',
  },
  {
    id: 'd1a9fdeb-f713-407f-960c-8326b586e6fd',
    title: 'Vagabond',
    description:
      'Após a Batalha de Sekigahara, o jovem Shinmen Takezo trilha o caminho solitário da espada sob o nome de Miyamoto Musashi, buscando compreender o verdadeiro significado da força.',
    status: 'hiatus',
    year: 1999,
    contentRating: 'suggestive',
    tags: [
      { id: 'b9af3a63-f058-46de-a9a0-e0c13906197a', name: 'Drama' },
      { id: '391b0423-d847-456f-aff0-8b0cfc03066b', name: 'Ação' },
      { id: '33771934-028e-4cb3-8744-691e866a923e', name: 'Samurai' },
    ],
    author: 'Inoue Takehiko',
    artist: 'Inoue Takehiko',
    coverFileName: '05f8dcb4-8ea1-48db-a0b1-3a8fbf695e5a.jpg',
    coverUrl: makeProxyCover('d1a9fdeb-f713-407f-960c-8326b586e6fd', '05f8dcb4-8ea1-48db-a0b1-3a8fbf695e5a.jpg', false),
    coverHighResUrl: makeProxyCover('d1a9fdeb-f713-407f-960c-8326b586e6fd', '05f8dcb4-8ea1-48db-a0b1-3a8fbf695e5a.jpg', true),
    accentColor: '#06B6D4',
    featuredChapterLabel: 'Cap. 327 • Obra-prima',
  },
  {
    id: '9a414441-bbad-43f1-a3a7-dc262ca790a3',
    title: "Omniscient Reader's Viewpoint",
    altTitle: 'Ponto de Vista do Leitor Onisciente',
    description:
      'Kim Dokja é o único leitor que chegou ao fim de uma webnovel obscura de 3.149 capítulos. No instante em que lê a página final, o apocalipse descrito no livro se torna realidade.',
    status: 'ongoing',
    year: 2020,
    contentRating: 'safe',
    tags: [
      { id: '3e2b8dae-350e-4ab8-a8ce-016e844b9f0d', name: 'Webtoon' },
      { id: 'cdc58593-87dd-415e-bbc0-2ec27bf404cc', name: 'Fantasia' },
      { id: '391b0423-d847-456f-aff0-8b0cfc03066b', name: 'Ação' },
    ],
    author: 'sing N song',
    artist: 'Sleepy-C',
    coverFileName: 'be18dc9a-7f1c-4ca5-b318-ffff2d7d58c3.jpg',
    coverUrl: makeProxyCover('9a414441-bbad-43f1-a3a7-dc262ca790a3', 'be18dc9a-7f1c-4ca5-b318-ffff2d7d58c3.jpg', false),
    coverHighResUrl: makeProxyCover('9a414441-bbad-43f1-a3a7-dc262ca790a3', 'be18dc9a-7f1c-4ca5-b318-ffff2d7d58c3.jpg', true),
    accentColor: '#06B6D4',
    featuredChapterLabel: 'Cap. 220+ • Webtoon',
  },
  {
    id: '68112dc1-2b80-4f20-beb8-2f2a8716a430',
    title: 'Dandadan',
    description:
      'Momo Ayase acredita em fantasmas mas duvida de alienígenas; Okarun acredita em OVNIs e duvida de espíritos. Uma aposta absurda mergulha os dois em um caos sobrenatural eletrizante.',
    status: 'ongoing',
    year: 2021,
    contentRating: 'suggestive',
    tags: [
      { id: '391b0423-d847-456f-aff0-8b0cfc03066b', name: 'Ação' },
      { id: '4d32cc48-9f00-4cca-9b5a-a839f0764984', name: 'Comédia' },
      { id: 'eabc5b4c-6aff-42f3-b657-3e90cbd00b75', name: 'Sobrenatural' },
    ],
    author: 'Tatsu Yukinobu',
    artist: 'Tatsu Yukinobu',
    coverFileName: 'b19f6cfd-cf51-49db-bc9f-e13ee272f458.jpg',
    coverUrl: makeProxyCover('68112dc1-2b80-4f20-beb8-2f2a8716a430', 'b19f6cfd-cf51-49db-bc9f-e13ee272f458.jpg', false),
    coverHighResUrl: makeProxyCover('68112dc1-2b80-4f20-beb8-2f2a8716a430', 'b19f6cfd-cf51-49db-bc9f-e13ee272f458.jpg', true),
    accentColor: '#10B981',
    featuredChapterLabel: 'Cap. 170+ • Sobrenatural',
  },
  {
    id: '5d1fc77e-706a-4fc5-bea8-486c9be0145d',
    title: 'Vinland Saga',
    description:
      'Criado nos campos de batalha dos vikings após o assassinato de seu pai, Thorfinn precisa descobrir se há uma vida possível além da vingança na lendária terra de Vinland.',
    status: 'completed',
    year: 2005,
    contentRating: 'suggestive',
    tags: [
      { id: 'b9af3a63-f058-46de-a9a0-e0c13906197a', name: 'Drama' },
      { id: '87cc87cd-a395-47af-b27a-93258283bbc6', name: 'Aventura' },
      { id: '391b0423-d847-456f-aff0-8b0cfc03066b', name: 'Ação' },
    ],
    author: 'Yukimura Makoto',
    artist: 'Yukimura Makoto',
    coverFileName: '7fa60f5d-285a-40c5-8a1d-9cf375eaf897.jpg',
    coverUrl: makeProxyCover('5d1fc77e-706a-4fc5-bea8-486c9be0145d', '7fa60f5d-285a-40c5-8a1d-9cf375eaf897.jpg', false),
    coverHighResUrl: makeProxyCover('5d1fc77e-706a-4fc5-bea8-486c9be0145d', '7fa60f5d-285a-40c5-8a1d-9cf375eaf897.jpg', true),
    accentColor: '#10B981',
    featuredChapterLabel: 'Cap. 220 • Histórico',
  },
  {
    id: 'd8a959f7-648e-4c8d-8f23-f1f3f8e129f3',
    title: 'One-Punch Man',
    description:
      'Saitama treinou tão duro que ficou forte demais: derrota qualquer ameaça com um único soco e agora busca um adversário à altura do seu tédio heroico.',
    status: 'ongoing',
    year: 2012,
    contentRating: 'safe',
    tags: [
      { id: '391b0423-d847-456f-aff0-8b0cfc03066b', name: 'Ação' },
      { id: '4d32cc48-9f00-4cca-9b5a-a839f0764984', name: 'Comédia' },
    ],
    author: 'ONE',
    artist: 'Murata Yuusuke',
    coverFileName: 'd22cfde3-268a-48a3-b5ed-73772834764d.jpg',
    coverUrl: makeProxyCover('d8a959f7-648e-4c8d-8f23-f1f3f8e129f3', 'd22cfde3-268a-48a3-b5ed-73772834764d.jpg', false),
    coverHighResUrl: makeProxyCover('d8a959f7-648e-4c8d-8f23-f1f3f8e129f3', 'd22cfde3-268a-48a3-b5ed-73772834764d.jpg', true),
    accentColor: '#F59E0B',
    featuredChapterLabel: 'Cap. 205+ • Arte HD',
  },
  {
    id: '6b958848-c885-4735-9201-12ee77abcb3c',
    title: 'SPY×FAMILY',
    description:
      'Para cumprir uma missão secreta, o espião Twilight forma uma família de fachada sem imaginar que sua esposa é uma assassina de elite e sua filha adotiva lê mentes.',
    status: 'ongoing',
    year: 2019,
    contentRating: 'safe',
    tags: [
      { id: '4d32cc48-9f00-4cca-9b5a-a839f0764984', name: 'Comédia' },
      { id: '391b0423-d847-456f-aff0-8b0cfc03066b', name: 'Ação' },
      { id: '423e2eae-a7a2-4a8b-ac03-a8351462d71d', name: 'Romance' },
    ],
    author: 'Endou Tatsuya',
    artist: 'Endou Tatsuya',
    coverFileName: '165260a4-6d0e-4164-966a-b7412a5b8a15.jpg',
    coverUrl: makeProxyCover('6b958848-c885-4735-9201-12ee77abcb3c', '165260a4-6d0e-4164-966a-b7412a5b8a15.jpg', false),
    coverHighResUrl: makeProxyCover('6b958848-c885-4735-9201-12ee77abcb3c', '165260a4-6d0e-4164-966a-b7412a5b8a15.jpg', true),
    accentColor: '#10B981',
    featuredChapterLabel: 'Cap. 105+ • Comédia',
  },
  {
    id: '4ada20eb-085a-491a-8c49-477ab42014d7',
    title: 'The Beginning After the End',
    description:
      'O temido Rei Grey reencarna em um mundo de magia e monstros como Arthur Leywin, recebendo uma segunda chance para proteger quem ama de ameaças antigas.',
    status: 'ongoing',
    year: 2018,
    contentRating: 'safe',
    tags: [
      { id: '3e2b8dae-350e-4ab8-a8ce-016e844b9f0d', name: 'Webtoon' },
      { id: 'ace04997-f6bd-436e-b261-779182193d3d', name: 'Isekai' },
      { id: 'cdc58593-87dd-415e-bbc0-2ec27bf404cc', name: 'Fantasia' },
    ],
    author: 'TurtleMe',
    artist: 'Fuyuki23',
    coverFileName: '4298e756-edf0-4bd6-9b83-340bfdb27771.jpg',
    coverUrl: makeProxyCover('4ada20eb-085a-491a-8c49-477ab42014d7', '4298e756-edf0-4bd6-9b83-340bfdb27771.jpg', false),
    coverHighResUrl: makeProxyCover('4ada20eb-085a-491a-8c49-477ab42014d7', '4298e756-edf0-4bd6-9b83-340bfdb27771.jpg', true),
    accentColor: '#8B5CF6',
    featuredChapterLabel: 'Cap. 190+ • Isekai',
  },
  {
    id: '4141c5dc-c525-4df5-afd7-cc7d192a832f',
    title: 'Blue Lock',
    description:
      'Após a eliminação do Japão na Copa do Mundo, um projeto radical tranca trezentos jovens atacantes em um centro de treinamento para forjar o centroavante mais egoísta do planeta.',
    status: 'ongoing',
    year: 2018,
    contentRating: 'safe',
    tags: [
      { id: '69964a64-2f90-4d33-beeb-f3ed2875eb4c', name: 'Esportes' },
      { id: 'b9af3a63-f058-46de-a9a0-e0c13906197a', name: 'Drama' },
    ],
    author: 'Kaneshiro Muneyuki',
    artist: 'Nomura Yuusuke',
    coverFileName: '617e530b-aed4-4825-a05a-75c656429d1f.jpg',
    coverUrl: makeProxyCover('4141c5dc-c525-4df5-afd7-cc7d192a832f', '617e530b-aed4-4825-a05a-75c656429d1f.jpg', false),
    coverHighResUrl: makeProxyCover('4141c5dc-c525-4df5-afd7-cc7d192a832f', '617e530b-aed4-4825-a05a-75c656429d1f.jpg', true),
    accentColor: '#06B6D4',
    featuredChapterLabel: 'Cap. 280+ • Esportes',
  },
  {
    id: '9d9b04ad-9a83-49f4-8ae4-a9a3780fe9c0',
    title: 'Sakamoto Days',
    description:
      'Taro Sakamoto era o assassino mais temido do submundo — até se apaixonar, aposentar-se e abrir uma loja de bairro. Agora precisa proteger sua família sem quebrar a regra de ouro.',
    status: 'ongoing',
    year: 2020,
    contentRating: 'safe',
    tags: [
      { id: '391b0423-d847-456f-aff0-8b0cfc03066b', name: 'Ação' },
      { id: '4d32cc48-9f00-4cca-9b5a-a839f0764984', name: 'Comédia' },
    ],
    author: 'Suzuki Yuuto',
    artist: 'Suzuki Yuuto',
    coverFileName: 'f15adf2e-164b-4ad8-a446-15839013d075.jpg',
    coverUrl: makeProxyCover('9d9b04ad-9a83-49f4-8ae4-a9a3780fe9c0', 'f15adf2e-164b-4ad8-a446-15839013d075.jpg', false),
    coverHighResUrl: makeProxyCover('9d9b04ad-9a83-49f4-8ae4-a9a3780fe9c0', 'f15adf2e-164b-4ad8-a446-15839013d075.jpg', true),
    accentColor: '#FF2A55',
    featuredChapterLabel: 'Cap. 190+ • Ação',
  },
  {
    id: 'db692d58-4b13-4174-ae8c-30c515c0689c',
    title: 'Hunter x Hunter',
    description:
      'Gon Freecss parte em uma jornada épica para obter a licença de Hunter e reencontrar seu pai, cruzando destinos com Killua, Kurapika e Leorio.',
    status: 'hiatus',
    year: 1998,
    contentRating: 'safe',
    tags: [
      { id: '87cc87cd-a395-47af-b27a-93258283bbc6', name: 'Aventura' },
      { id: '391b0423-d847-456f-aff0-8b0cfc03066b', name: 'Ação' },
      { id: 'cdc58593-87dd-415e-bbc0-2ec27bf404cc', name: 'Fantasia' },
    ],
    author: 'Togashi Yoshihiro',
    artist: 'Togashi Yoshihiro',
    coverFileName: 'aa112927-f1e5-4fe4-a4db-7fd4a1536e3c.jpg',
    coverUrl: makeProxyCover('db692d58-4b13-4174-ae8c-30c515c0689c', 'aa112927-f1e5-4fe4-a4db-7fd4a1536e3c.jpg', false),
    coverHighResUrl: makeProxyCover('db692d58-4b13-4174-ae8c-30c515c0689c', 'aa112927-f1e5-4fe4-a4db-7fd4a1536e3c.jpg', true),
    accentColor: '#10B981',
    featuredChapterLabel: 'Cap. 410+ • Clássico',
  },
  {
    id: 'dd8a907a-3850-4f95-ba03-ba201a8399e3',
    title: 'Fullmetal Alchemist',
    description:
      'Os irmãos Edward e Alphonse Elric pagam um preço terrível ao tentar quebrar o maior tabu da alquimia e viajam pelo país atrás da lendária Pedra Filosofal.',
    status: 'completed',
    year: 2001,
    contentRating: 'safe',
    tags: [
      { id: '87cc87cd-a395-47af-b27a-93258283bbc6', name: 'Aventura' },
      { id: 'b9af3a63-f058-46de-a9a0-e0c13906197a', name: 'Drama' },
      { id: 'cdc58593-87dd-415e-bbc0-2ec27bf404cc', name: 'Fantasia' },
    ],
    author: 'Arakawa Hiromu',
    artist: 'Arakawa Hiromu',
    coverFileName: 'a9cd0207-1b86-4738-a2b5-3575c32d5315.jpg',
    coverUrl: makeProxyCover('dd8a907a-3850-4f95-ba03-ba201a8399e3', 'a9cd0207-1b86-4738-a2b5-3575c32d5315.jpg', false),
    coverHighResUrl: makeProxyCover('dd8a907a-3850-4f95-ba03-ba201a8399e3', 'a9cd0207-1b86-4738-a2b5-3575c32d5315.jpg', true),
    accentColor: '#F59E0B',
    featuredChapterLabel: 'Cap. 108 • Completo',
  },
  {
    id: '077a3fed-1634-424f-be7a-9a96b7f07b78',
    title: 'Kingdom',
    description:
      'Na antiga China dos Reinos Combatentes, o órfão de guerra Shin sonha em se tornar o maior general sob os céus enquanto ajuda a unificar uma nação dividida.',
    status: 'ongoing',
    year: 2006,
    contentRating: 'suggestive',
    tags: [
      { id: '391b0423-d847-456f-aff0-8b0cfc03066b', name: 'Ação' },
      { id: 'b9af3a63-f058-46de-a9a0-e0c13906197a', name: 'Drama' },
    ],
    author: 'Hara Yasuhisa',
    artist: 'Hara Yasuhisa',
    coverFileName: '8bc7a592-764d-4a89-a0ae-741347b894ce.jpg',
    coverUrl: makeProxyCover('077a3fed-1634-424f-be7a-9a96b7f07b78', '8bc7a592-764d-4a89-a0ae-741347b894ce.jpg', false),
    coverHighResUrl: makeProxyCover('077a3fed-1634-424f-be7a-9a96b7f07b78', '8bc7a592-764d-4a89-a0ae-741347b894ce.jpg', true),
    accentColor: '#FF2A55',
    featuredChapterLabel: 'Cap. 810+ • Seinen',
  },
  {
    id: '6a1d1cb1-ecd5-40d9-89ff-9d88e40b136b',
    title: 'Tokyo Ghoul',
    description:
      'Após sobreviver a um encontro mortal em Tóquio, o universitário Ken Kaneki desperta transformado em meio-ghoul e precisa sobreviver dividido entre dois mundos.',
    status: 'completed',
    year: 2011,
    contentRating: 'suggestive',
    tags: [
      { id: 'cdad7e68-1419-41dd-bdce-27753074a640', name: 'Terror' },
      { id: '3b60b75c-a2d7-4860-ab56-05f391bb889c', name: 'Psicológico' },
    ],
    author: 'Ishida Sui',
    artist: 'Ishida Sui',
    coverFileName: '040e8ae9-4ddd-49d2-8986-56782b391714.jpg',
    coverUrl: makeProxyCover('6a1d1cb1-ecd5-40d9-89ff-9d88e40b136b', '040e8ae9-4ddd-49d2-8986-56782b391714.jpg', false),
    coverHighResUrl: makeProxyCover('6a1d1cb1-ecd5-40d9-89ff-9d88e40b136b', '040e8ae9-4ddd-49d2-8986-56782b391714.jpg', true),
    accentColor: '#FF2A55',
    featuredChapterLabel: 'Cap. 143 • Completo',
  },
  {
    id: 'a25e46ec-30f7-4db6-89df-cacbc1d9a900',
    title: 'Horimiya',
    description:
      'Hori esconde seu lado caseiro na escola; Miyamura esconde tatuagens e piercings sob óculos discretos. Quando se cruzam fora da aula, nasce uma amizade inesquecível.',
    status: 'completed',
    year: 2011,
    contentRating: 'safe',
    tags: [
      { id: '423e2eae-a7a2-4a8b-ac03-a8351462d71d', name: 'Romance' },
      { id: '4d32cc48-9f00-4cca-9b5a-a839f0764984', name: 'Comédia' },
    ],
    author: 'HERO',
    artist: 'Hagiwara Daisuke',
    coverFileName: '04feed00-d919-4c72-b355-15b37555eb1e.jpg',
    coverUrl: makeProxyCover('a25e46ec-30f7-4db6-89df-cacbc1d9a900', '04feed00-d919-4c72-b355-15b37555eb1e.jpg', false),
    coverHighResUrl: makeProxyCover('a25e46ec-30f7-4db6-89df-cacbc1d9a900', '04feed00-d919-4c72-b355-15b37555eb1e.jpg', true),
    accentColor: '#EC4899',
    featuredChapterLabel: 'Cap. 132 • Romance',
  },
  {
    id: 'aa6c76f7-5f5f-46b6-a800-911145f81b9b',
    title: 'My Dress-Up Darling',
    description:
      'Gojou confecciona bonecas tradicionais em segredo até Marin Kitagawa descobrir seu talento e convidá-lo para dar vida aos cosplays de suas personagens favoritas.',
    status: 'completed',
    year: 2018,
    contentRating: 'suggestive',
    tags: [
      { id: '423e2eae-a7a2-4a8b-ac03-a8351462d71d', name: 'Romance' },
      { id: '4d32cc48-9f00-4cca-9b5a-a839f0764984', name: 'Comédia' },
    ],
    author: 'Fukuda Shinichi',
    artist: 'Fukuda Shinichi',
    coverFileName: 'd3e909b9-c667-48a5-beec-ac96f23fa228.jpg',
    coverUrl: makeProxyCover('aa6c76f7-5f5f-46b6-a800-911145f81b9b', 'd3e909b9-c667-48a5-beec-ac96f23fa228.jpg', false),
    coverHighResUrl: makeProxyCover('aa6c76f7-5f5f-46b6-a800-911145f81b9b', 'd3e909b9-c667-48a5-beec-ac96f23fa228.jpg', true),
    accentColor: '#EC4899',
    featuredChapterLabel: 'Cap. 115 • Romance',
  },
  {
    id: 'bd6d0982-0091-4945-ad70-c028ed3c0917',
    title: 'Mushoku Tensei',
    description:
      'Rudeus Greyrat desperta em um mundo de magia e espadachins mantendo todas as memórias de sua vida passada, determinado a nunca mais se arrepender.',
    status: 'ongoing',
    year: 2014,
    contentRating: 'suggestive',
    tags: [
      { id: 'ace04997-f6bd-436e-b261-779182193d3d', name: 'Isekai' },
      { id: 'cdc58593-87dd-415e-bbc0-2ec27bf404cc', name: 'Fantasia' },
    ],
    author: 'Rifujin na Magonote',
    artist: 'Fujikawa Yuka',
    coverFileName: '6a9f3d32-b7bb-478a-9c76-54868276c26f.jpg',
    coverUrl: makeProxyCover('bd6d0982-0091-4945-ad70-c028ed3c0917', '6a9f3d32-b7bb-478a-9c76-54868276c26f.jpg', false),
    coverHighResUrl: makeProxyCover('bd6d0982-0091-4945-ad70-c028ed3c0917', '6a9f3d32-b7bb-478a-9c76-54868276c26f.jpg', true),
    accentColor: '#8B5CF6',
    featuredChapterLabel: 'Cap. 105+ • Isekai',
  },
  {
    id: '77bee52c-d2d6-44ad-a33a-1734c1fe696a',
    title: 'The Eminence in Shadow',
    description:
      'Cid Kagenou reencarna decidido a atuar apenas como figurante enquanto comanda nas sombras uma organização secreta — sem perceber que toda a trama inventada é real.',
    status: 'ongoing',
    year: 2018,
    contentRating: 'safe',
    tags: [
      { id: 'ace04997-f6bd-436e-b261-779182193d3d', name: 'Isekai' },
      { id: '391b0423-d847-456f-aff0-8b0cfc03066b', name: 'Ação' },
      { id: '4d32cc48-9f00-4cca-9b5a-a839f0764984', name: 'Comédia' },
    ],
    author: 'Aizawa Daisuke',
    artist: 'Sakano Anri',
    coverFileName: '6079dd31-838b-4d61-87c4-121f3ad19158.jpg',
    coverUrl: makeProxyCover('77bee52c-d2d6-44ad-a33a-1734c1fe696a', '6079dd31-838b-4d61-87c4-121f3ad19158.jpg', false),
    coverHighResUrl: makeProxyCover('77bee52c-d2d6-44ad-a33a-1734c1fe696a', '6079dd31-838b-4d61-87c4-121f3ad19158.jpg', true),
    accentColor: '#8B5CF6',
    featuredChapterLabel: 'Cap. 68+ • Isekai',
  },
  {
    id: 'e78a489b-6632-4d61-b00b-5206f5b8b22b',
    title: 'That Time I Got Reincarnated as a Slime',
    description:
      'Renascido como um simples slime em um mundo fantástico, Rimuru Tempest conquista habilidades únicas e reúne aliados para construir uma nação pacífica de monstros.',
    status: 'ongoing',
    year: 2015,
    contentRating: 'safe',
    tags: [
      { id: 'ace04997-f6bd-436e-b261-779182193d3d', name: 'Isekai' },
      { id: 'cdc58593-87dd-415e-bbc0-2ec27bf404cc', name: 'Fantasia' },
    ],
    author: 'Fuse',
    artist: 'Kawakami Taiki',
    coverFileName: '420ec3c0-2dab-47f2-8f9e-a9e0c3faf16d.jpg',
    coverUrl: makeProxyCover('e78a489b-6632-4d61-b00b-5206f5b8b22b', '420ec3c0-2dab-47f2-8f9e-a9e0c3faf16d.jpg', false),
    coverHighResUrl: makeProxyCover('e78a489b-6632-4d61-b00b-5206f5b8b22b', '420ec3c0-2dab-47f2-8f9e-a9e0c3faf16d.jpg', true),
    accentColor: '#06B6D4',
    featuredChapterLabel: 'Cap. 122+ • Fantasia',
  },
  {
    id: '239d6260-d71f-43b0-afff-074e3619e3de',
    title: 'Bleach',
    description:
      'Ichigo Kurosaki herda os poderes de uma Ceifadora de Almas e passa a defender sua cidade contra Hollows enquanto descobre os segredos da Soul Society.',
    status: 'completed',
    year: 2001,
    contentRating: 'safe',
    tags: [
      { id: '391b0423-d847-456f-aff0-8b0cfc03066b', name: 'Ação' },
      { id: 'eabc5b4c-6aff-42f3-b657-3e90cbd00b75', name: 'Sobrenatural' },
    ],
    author: 'Kubo Tite',
    artist: 'Kubo Tite',
    coverFileName: '032cc781-43eb-4281-956c-7cf991dd0a6a.jpg',
    coverUrl: makeProxyCover('239d6260-d71f-43b0-afff-074e3619e3de', '032cc781-43eb-4281-956c-7cf991dd0a6a.jpg', false),
    coverHighResUrl: makeProxyCover('239d6260-d71f-43b0-afff-074e3619e3de', '032cc781-43eb-4281-956c-7cf991dd0a6a.jpg', true),
    accentColor: '#F59E0B',
    featuredChapterLabel: 'Cap. 686 • Completo',
  },
  {
    id: '3df1a9a3-a1be-47a3-9e90-9b3e55b1d0ac',
    title: 'The Dangers in My Heart',
    description:
      'Kyotaro Ichikawa é um garoto reservado que observa à distância a garota mais popular da turma, até descobrir um lado surpreendentemente sincero em Anna Yamada.',
    status: 'completed',
    year: 2018,
    contentRating: 'safe',
    tags: [
      { id: '423e2eae-a7a2-4a8b-ac03-a8351462d71d', name: 'Romance' },
      { id: 'e5301a23-ebd9-49dd-a0cb-2add944c7fe9', name: 'Cotidiano' },
    ],
    author: 'Sakurai Norio',
    artist: 'Sakurai Norio',
    coverFileName: '0594a53a-1fc3-43fc-bd24-f793bdc114d7.jpg',
    coverUrl: makeProxyCover('3df1a9a3-a1be-47a3-9e90-9b3e55b1d0ac', '0594a53a-1fc3-43fc-bd24-f793bdc114d7.jpg', false),
    coverHighResUrl: makeProxyCover('3df1a9a3-a1be-47a3-9e90-9b3e55b1d0ac', '0594a53a-1fc3-43fc-bd24-f793bdc114d7.jpg', true),
    accentColor: '#10B981',
    featuredChapterLabel: 'Cap. 199 • Romance',
  },
];

export function findCuratedWorkById(id: string): MangaDexWork | undefined {
  return CURATED_POPULAR_WORKS.find((item) => item.id === id);
}

/**
 * Seleciona 5 obras em destaque de forma aleatória determinística dentro de uma janela de 45 minutos
 * (mesma regra do aplicativo Android YOMI), garantindo variação contínua ao longo do dia.
 */
export function selectTimeWindowFeaturedWorks(
  pool: MangaDexWork[],
  count = 5,
  nowMs: number = Date.now(),
  windowMinutes = 45
): MangaDexWork[] {
  const source = pool.length > 0 ? pool : CURATED_POPULAR_WORKS;
  if (source.length <= count) return source;

  const slot = Math.floor(nowMs / (windowMinutes * 60 * 1000));
  const candidatePool = source.slice(0, 24);
  const copy = [...candidatePool];

  // PRNG determinístico (Mulberry32) para que a ordem dos 5 destaques mude a cada janela de tempo
  let a = slot + 0x6d2b79f5;
  const nextRand = () => {
    a = Math.imul(a ^ (a >>> 15), a | 1);
    a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy.slice(0, count);
}
