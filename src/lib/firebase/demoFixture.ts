import {
  encodeKuroBackup,
  type YomiBackupV4,
} from '@/lib/backup/kuroCodec';

export const DEMO_BACKUP_OBJECT: YomiBackupV4 = {
  version: 4,
  profile: {
    name: 'Akira Kurosawa',
    bio: 'Leitor noturno de Seinen, Dark Fantasy e Manhwas em modo AMOLED.',
    favoriteGenre: 'Seinen / Fantasia Sombria',
    blobatarName: 'Kuro-chan',
    blobatarShape: 'cat',
    blobatarExpression: 'happy',
    customAccentColor: 0xffff2a55,
    blobatarHue: 348,
    openOnProfileByDefault: false,
    isConfigured: true,
    useBlobatarAsAvatar: true,
  },
  favorites: {
    'a1c7c817-4e59-43b7-9365-09675a149a6f': {
      id: 'a1c7c817-4e59-43b7-9365-09675a149a6f',
      title: 'One Piece',
      description: 'A grande era dos piratas em busca do tesouro definitivo.',
      status: 'ongoing',
      source: 'mangadex',
      coverFileName: '2f4aca53-64c7-46ac-ae85-3bc9b3169890.png',
      tags: ['Ação', 'Aventura', 'Fantasia'],
      isNsfw: false,
      availableChaptersCount: 1130,
    },
    '32d76d19-8a05-4db0-9fc2-e0b0648fe9d0': {
      id: '32d76d19-8a05-4db0-9fc2-e0b0648fe9d0',
      title: 'Solo Leveling',
      description: 'O caçador mais fraco da humanidade desperta um sistema único.',
      status: 'completed',
      source: 'mangadex',
      coverFileName: 'e90bdc47-c8b9-4df7-b2c0-17641b645ee1.jpg',
      tags: ['Ação', 'Fantasia', 'Webtoon'],
      isNsfw: false,
      availableChaptersCount: 200,
    },
    '801513ba-a712-498c-8f57-cae55b38cc92': {
      id: '801513ba-a712-498c-8f57-cae55b38cc92',
      title: 'Berserk',
      description: 'A jornada implacável do Espadachim Negro.',
      status: 'ongoing',
      source: 'mangadex',
      coverFileName: '81e1c82d-6672-400c-8c58-4ff9bfb89031.jpg',
      tags: ['Ação', 'Fantasia Sombria', 'Seinen'],
      isNsfw: false,
      availableChaptersCount: 376,
    },
  },
  history: {
    'page_82625848-f46c-4a7d-b07e-f276dc575492': 18,
    'read_d5431b60-a7c2-49b5-ac5c-872d02ab05c8': true,
    recent_reading_list: [
      {
        manga: {
          id: '32d76d19-8a05-4db0-9fc2-e0b0648fe9d0',
          title: 'Solo Leveling',
          source: 'mangadex',
          coverFileName: 'e90bdc47-c8b9-4df7-b2c0-17641b645ee1.jpg',
        },
        chapter: {
          id: '82625848-f46c-4a7d-b07e-f276dc575492',
          chapterNumber: '3',
          title: 'A Dungeon Dupla',
          language: 'PT-BR',
          pages: 24,
        },
        timestamp: '2026-11-14T20:30:00.000Z',
      },
      {
        manga: {
          id: '801513ba-a712-498c-8f57-cae55b38cc92',
          title: 'Berserk',
          source: 'mangadex',
          coverFileName: '81e1c82d-6672-400c-8c58-4ff9bfb89031.jpg',
        },
        chapter: {
          id: 'd5431b60-a7c2-49b5-ac5c-872d02ab05c8',
          chapterNumber: '375',
          title: 'Névoa sobre o Mar',
          language: 'PT-BR',
          pages: 21,
        },
        timestamp: '2026-11-13T23:12:00.000Z',
      },
    ],
  },
  settings: {
    lock_nsfw_on_startup: true,
    hide_zero_chapters: true,
    data_saver_mode: false,
    interface_style: 'glass',
    user_reading_lists: [
      {
        id: 'list-favoritos-noite',
        name: 'Leituras da Madrugada',
        description: 'Obras perfeitas para ler no modo AMOLED antes de dormir.',
        createdAt: '2026-11-10T01:00:00.000Z',
        mangas: [
          {
            id: '32d76d19-8a05-4db0-9fc2-e0b0648fe9d0',
            title: 'Solo Leveling',
            source: 'mangadex',
            coverFileName: 'e90bdc47-c8b9-4df7-b2c0-17641b645ee1.jpg',
          },
          {
            id: '801513ba-a712-498c-8f57-cae55b38cc92',
            title: 'Berserk',
            source: 'mangadex',
            coverFileName: '81e1c82d-6672-400c-8c58-4ff9bfb89031.jpg',
          },
        ],
      },
    ],
  },
  legacyCustomDeviceFlag: 'preserved-key-example',
};

export function getDemoCloudDocument() {
  return {
    uid: 'demo-user-uid',
    userEmail: 'leitor@yomi.app',
    userDisplayName: 'Akira Kurosawa',
    updatedAtLocal: '2026-11-14T21:15:00.000Z',
    appVersion: '1.2.8',
    appBuild: 16,
    payload: encodeKuroBackup(DEMO_BACKUP_OBJECT, true),
    profile: DEMO_BACKUP_OBJECT.profile ?? {},
    hasCustomAvatar: false,
    hasCustomBanner: false,
    favoritesCount: 3,
    historyCount: 3,
    readingListsCount: 1,
    mascotName: 'Kuro-chan',
  };
}
