// Références bibliques depuis le fichier IREO TENY FIKASANA HOTAKINA AO AMIN'NY VAVAKA
export interface VerseReference {
  id: number;
  reference: string;
  category: string;
  bookId: number; // ID correct dans la base de données
  bookName: string; // Nom du livre selon BOOK_MAP
  chapter: number;
  verse: number;
}

export const versesData: VerseReference[] = [
  {
    "id": 1,
    "reference": "Zak. 10:1",
    "category": "Fanahy Masina",
    "bookId": 38,
    "bookName": "Zakaria",
    "chapter": 10,
    "verse": 1
  },
  {
    "id": 2,
    "reference": "Lio. 11:13",
    "category": "Fanahy Masina",
    "bookId": 42,
    "bookName": "Lioka",
    "chapter": 11,
    "verse": 13
  },
  {
    "id": 3,
    "reference": "Jao. 14:26",
    "category": "Fanahy Masina",
    "bookId": 43,
    "bookName": "Jaona",
    "chapter": 14,
    "verse": 26
  },
  {
    "id": 4,
    "reference": "Jao. 14:12",
    "category": "Fanahy Masina",
    "bookId": 43,
    "bookName": "Jaona",
    "chapter": 14,
    "verse": 12
  },
  {
    "id": 5,
    "reference": "Zak. 4:6",
    "category": "Fanahy Masina",
    "bookId": 38,
    "bookName": "Zakaria",
    "chapter": 4,
    "verse": 6
  },
  {
    "id": 6,
    "reference": "Jao. 15:7",
    "category": "Vavaka",
    "bookId": 43,
    "bookName": "Jaona",
    "chapter": 15,
    "verse": 7
  },
  {
    "id": 7,
    "reference": "Heb. 4:16",
    "category": "Vavaka",
    "bookId": 58,
    "bookName": "Hebreo",
    "chapter": 4,
    "verse": 16
  },
  {
    "id": 8,
    "reference": "Mar. 11:24",
    "category": "Vavaka",
    "bookId": 41,
    "bookName": "Marka",
    "chapter": 11,
    "verse": 24
  },
  {
    "id": 9,
    "reference": "Sal. 50:15",
    "category": "Vavaka",
    "bookId": 19,
    "bookName": "Salamo",
    "chapter": 50,
    "verse": 15
  },
  {
    "id": 10,
    "reference": "Mat. 18:19",
    "category": "Vavaka",
    "bookId": 40,
    "bookName": "Matio",
    "chapter": 18,
    "verse": 19
  },
  {
    "id": 11,
    "reference": "Mat. 21:22",
    "category": "Vavaka",
    "bookId": 40,
    "bookName": "Matio",
    "chapter": 21,
    "verse": 22
  },
  {
    "id": 12,
    "reference": "Jao. 14:13",
    "category": "Vavaka",
    "bookId": 43,
    "bookName": "Jaona",
    "chapter": 14,
    "verse": 13
  },
  {
    "id": 13,
    "reference": "Jao. 16:23",
    "category": "Vavaka",
    "bookId": 43,
    "bookName": "Jaona",
    "chapter": 16,
    "verse": 23
  },
  {
    "id": 14,
    "reference": "1 Jao. 5:14",
    "category": "Vavaka",
    "bookId": 62,
    "bookName": "1 Jaona",
    "chapter": 5,
    "verse": 14
  },
  {
    "id": 15,
    "reference": "Gen. 18:14",
    "category": "Herin'Andriamanitra",
    "bookId": 1,
    "bookName": "Genesisy",
    "chapter": 18,
    "verse": 14
  },
  {
    "id": 16,
    "reference": "Eks. 14:14",
    "category": "Herin'Andriamanitra",
    "bookId": 2,
    "bookName": "Eksodosy",
    "chapter": 14,
    "verse": 14
  },
  {
    "id": 17,
    "reference": "Mar. 10:27",
    "category": "Herin'Andriamanitra",
    "bookId": 41,
    "bookName": "Marka",
    "chapter": 10,
    "verse": 27
  },
  {
    "id": 18,
    "reference": "1 Tes. 5:24",
    "category": "Herin'Andriamanitra",
    "bookId": 52,
    "bookName": "1 Tesaloniana",
    "chapter": 5,
    "verse": 24
  },
  {
    "id": 19,
    "reference": "Jôba 42:2",
    "category": "Herin'Andriamanitra",
    "bookId": 18,
    "bookName": "Joba",
    "chapter": 42,
    "verse": 2
  },
  {
    "id": 20,
    "reference": "Rôm. 8:31",
    "category": "Herin'Andriamanitra",
    "bookId": 45,
    "bookName": "Romana",
    "chapter": 8,
    "verse": 31
  },
  {
    "id": 21,
    "reference": "Nom. 23:19",
    "category": "Herin'Andriamanitra",
    "bookId": 4,
    "bookName": "Nomery",
    "chapter": 23,
    "verse": 19
  },
  {
    "id": 22,
    "reference": "Isa. 40:28",
    "category": "Herin'Andriamanitra",
    "bookId": 23,
    "bookName": "Isaia",
    "chapter": 40,
    "verse": 28
  },
  {
    "id": 23,
    "reference": "Jos. 1:9",
    "category": "Fitarihan'Andriamanitra",
    "bookId": 6,
    "bookName": "Josoa",
    "chapter": 1,
    "verse": 9
  },
  {
    "id": 24,
    "reference": "Gen. 28:15",
    "category": "Fitarihan'Andriamanitra",
    "bookId": 1,
    "bookName": "Genesisy",
    "chapter": 28,
    "verse": 15
  },
  {
    "id": 25,
    "reference": "Eks. 23:20",
    "category": "Fitarihan'Andriamanitra",
    "bookId": 2,
    "bookName": "Eksodosy",
    "chapter": 23,
    "verse": 20
  },
  {
    "id": 26,
    "reference": "Deo. 4:29",
    "category": "Fitarihan'Andriamanitra",
    "bookId": 5,
    "bookName": "Deotoronomia",
    "chapter": 4,
    "verse": 29
  },
  {
    "id": 27,
    "reference": "Jer. 33:3",
    "category": "Fitarihan'Andriamanitra",
    "bookId": 24,
    "bookName": "Jeremia",
    "chapter": 33,
    "verse": 3
  },
  {
    "id": 28,
    "reference": "Isa. 40:4",
    "category": "Fitarihan'Andriamanitra",
    "bookId": 23,
    "bookName": "Isaia",
    "chapter": 40,
    "verse": 4
  },
  {
    "id": 29,
    "reference": "Sal. 32:8",
    "category": "Fitarihan'Andriamanitra",
    "bookId": 19,
    "bookName": "Salamo",
    "chapter": 32,
    "verse": 8
  },
  {
    "id": 30,
    "reference": "Deo. 31:8",
    "category": "Fitarihan'Andriamanitra",
    "bookId": 5,
    "bookName": "Deotoronomia",
    "chapter": 31,
    "verse": 8
  },
  {
    "id": 31,
    "reference": "Sal. 25:12",
    "category": "Fitarihan'Andriamanitra",
    "bookId": 19,
    "bookName": "Salamo",
    "chapter": 25,
    "verse": 12
  },
  {
    "id": 32,
    "reference": "Ohab. 3:5",
    "category": "Fitarihan'Andriamanitra",
    "bookId": 20,
    "bookName": "Ohabolana",
    "chapter": 3,
    "verse": 5
  },
  {
    "id": 33,
    "reference": "Isa. 58:10",
    "category": "Fitarihan'Andriamanitra",
    "bookId": 23,
    "bookName": "Isaia",
    "chapter": 58,
    "verse": 10
  },
  {
    "id": 34,
    "reference": "Isa. 65:24",
    "category": "Fitarihan'Andriamanitra",
    "bookId": 23,
    "bookName": "Isaia",
    "chapter": 65,
    "verse": 24
  },
  {
    "id": 35,
    "reference": "Jer. 24:7",
    "category": "Fiovam-po",
    "bookId": 24,
    "bookName": "Jeremia",
    "chapter": 24,
    "verse": 7
  },
  {
    "id": 36,
    "reference": "Deo. 30:6",
    "category": "Fiovam-po",
    "bookId": 5,
    "bookName": "Deotoronomia",
    "chapter": 30,
    "verse": 6
  },
  {
    "id": 37,
    "reference": "Ezek. 36:26",
    "category": "Fiovam-po",
    "bookId": 26,
    "bookName": "Ezekiela",
    "chapter": 36,
    "verse": 26
  },
  {
    "id": 38,
    "reference": "Fil. 1:6",
    "category": "Fiovam-po",
    "bookId": 50,
    "bookName": "Filipiana",
    "chapter": 1,
    "verse": 6
  },
  {
    "id": 39,
    "reference": "2 Kôr. 5:17",
    "category": "Fiovam-po",
    "bookId": 47,
    "bookName": "2 Korintiana",
    "chapter": 5,
    "verse": 17
  },
  {
    "id": 40,
    "reference": "Gal. 2:20",
    "category": "Fiovam-po",
    "bookId": 48,
    "bookName": "Galatiana",
    "chapter": 2,
    "verse": 20
  },
  {
    "id": 41,
    "reference": "1 Tes. 5:23",
    "category": "Fiovam-po",
    "bookId": 52,
    "bookName": "1 Tesaloniana",
    "chapter": 5,
    "verse": 23
  },
  {
    "id": 42,
    "reference": "2 Tant. 7:14",
    "category": "Famela-keloka",
    "bookId": 14,
    "bookName": "2 Tantara",
    "chapter": 7,
    "verse": 14
  },
  {
    "id": 43,
    "reference": "Sal. 86:5",
    "category": "Famela-keloka",
    "bookId": 19,
    "bookName": "Salamo",
    "chapter": 86,
    "verse": 5
  },
  {
    "id": 44,
    "reference": "Mar. 11:25",
    "category": "Famela-keloka",
    "bookId": 41,
    "bookName": "Marka",
    "chapter": 11,
    "verse": 25
  },
  {
    "id": 45,
    "reference": "Efes. 4:32",
    "category": "Famela-keloka",
    "bookId": 49,
    "bookName": "Efesiana",
    "chapter": 4,
    "verse": 32
  },
  {
    "id": 46,
    "reference": "1 Jao. 1:9",
    "category": "Famela-keloka",
    "bookId": 62,
    "bookName": "1 Jaona",
    "chapter": 1,
    "verse": 9
  },
  {
    "id": 47,
    "reference": "Isa. 1:18",
    "category": "Famela-keloka",
    "bookId": 23,
    "bookName": "Isaia",
    "chapter": 1,
    "verse": 18
  },
  {
    "id": 48,
    "reference": "Isa. 43:25",
    "category": "Famela-keloka",
    "bookId": 23,
    "bookName": "Isaia",
    "chapter": 43,
    "verse": 25
  },
  {
    "id": 49,
    "reference": "Jer. 31:34",
    "category": "Famela-keloka",
    "bookId": 24,
    "bookName": "Jeremia",
    "chapter": 31,
    "verse": 34
  },
  {
    "id": 50,
    "reference": "Efes. 1:7",
    "category": "Famela-keloka",
    "bookId": 49,
    "bookName": "Efesiana",
    "chapter": 1,
    "verse": 7
  },
  {
    "id": 51,
    "reference": "1 Jao. 5:4",
    "category": "Fandresena ny fahotana",
    "bookId": 62,
    "bookName": "1 Jaona",
    "chapter": 5,
    "verse": 4
  },
  {
    "id": 52,
    "reference": "Rôm. 8:37",
    "category": "Fandresena ny fahotana",
    "bookId": 45,
    "bookName": "Romana",
    "chapter": 8,
    "verse": 37
  },
  {
    "id": 53,
    "reference": "1 Kôr. 15:57",
    "category": "Fandresena ny fahotana",
    "bookId": 46,
    "bookName": "1 Korintiana",
    "chapter": 15,
    "verse": 57
  },
  {
    "id": 54,
    "reference": "Isa. 41:10",
    "category": "Fandresena ny fahotana",
    "bookId": 23,
    "bookName": "Isaia",
    "chapter": 41,
    "verse": 10
  },
  {
    "id": 55,
    "reference": "Efes. 6:16",
    "category": "Fandresena ny fahotana",
    "bookId": 49,
    "bookName": "Efesiana",
    "chapter": 6,
    "verse": 16
  },
  {
    "id": 56,
    "reference": "Fil. 2:13",
    "category": "Fandresena ny fahotana",
    "bookId": 50,
    "bookName": "Filipiana",
    "chapter": 2,
    "verse": 13
  },
  {
    "id": 57,
    "reference": "Gal. 5:16",
    "category": "Fandresena ny fahotana",
    "bookId": 48,
    "bookName": "Galatiana",
    "chapter": 5,
    "verse": 16
  },
  {
    "id": 58,
    "reference": "Rôm. 16:20",
    "category": "Fandresena ny fahotana",
    "bookId": 45,
    "bookName": "Romana",
    "chapter": 16,
    "verse": 20
  },
  {
    "id": 59,
    "reference": "Rôm. 12:2",
    "category": "Fandresena ny fahotana",
    "bookId": 45,
    "bookName": "Romana",
    "chapter": 12,
    "verse": 2
  },
  {
    "id": 60,
    "reference": "1 Jao. 2:15",
    "category": "Fandresena ny fahotana",
    "bookId": 62,
    "bookName": "1 Jaona",
    "chapter": 2,
    "verse": 15
  },
  {
    "id": 61,
    "reference": "Eks. 15:26",
    "category": "Fahasitranana",
    "bookId": 2,
    "bookName": "Eksodosy",
    "chapter": 15,
    "verse": 26
  },
  {
    "id": 62,
    "reference": "Deo. 33:25",
    "category": "Fahasitranana",
    "bookId": 5,
    "bookName": "Deotoronomia",
    "chapter": 33,
    "verse": 25
  },
  {
    "id": 63,
    "reference": "Sal. 103:2",
    "category": "Fahasitranana",
    "bookId": 19,
    "bookName": "Salamo",
    "chapter": 103,
    "verse": 2
  },
  {
    "id": 64,
    "reference": "Isa. 53:3",
    "category": "Fahasitranana",
    "bookId": 23,
    "bookName": "Isaia",
    "chapter": 53,
    "verse": 3
  },
  {
    "id": 65,
    "reference": "Jer. 17:14",
    "category": "Fahasitranana",
    "bookId": 24,
    "bookName": "Jeremia",
    "chapter": 17,
    "verse": 14
  },
  {
    "id": 66,
    "reference": "Jer. 30:17",
    "category": "Fahasitranana",
    "bookId": 24,
    "bookName": "Jeremia",
    "chapter": 30,
    "verse": 17
  },
  {
    "id": 67,
    "reference": "Jer. 33:6",
    "category": "Fahasitranana",
    "bookId": 24,
    "bookName": "Jeremia",
    "chapter": 33,
    "verse": 6
  },
  {
    "id": 68,
    "reference": "Mal. 3:20",
    "category": "Fahasitranana",
    "bookId": 39,
    "bookName": "Malakia",
    "chapter": 3,
    "verse": 20
  },
  {
    "id": 69,
    "reference": "Jak. 5:14",
    "category": "Fahasitranana",
    "bookId": 59,
    "bookName": "Jakoba",
    "chapter": 5,
    "verse": 14
  },
  {
    "id": 70,
    "reference": "2 Kôr. 4:16",
    "category": "Hery hanaovana ny sitrapony",
    "bookId": 47,
    "bookName": "2 Korintiana",
    "chapter": 4,
    "verse": 16
  },
  {
    "id": 71,
    "reference": "Gal. 6:9",
    "category": "Hery hanaovana ny sitrapony",
    "bookId": 48,
    "bookName": "Galatiana",
    "chapter": 6,
    "verse": 9
  },
  {
    "id": 72,
    "reference": "Fil. 4:13",
    "category": "Hery hanaovana ny sitrapony",
    "bookId": 50,
    "bookName": "Filipiana",
    "chapter": 4,
    "verse": 13
  },
  {
    "id": 73,
    "reference": "2 Kôr. 12:9",
    "category": "Hery hanaovana ny sitrapony",
    "bookId": 47,
    "bookName": "2 Korintiana",
    "chapter": 12,
    "verse": 9
  },
  {
    "id": 74,
    "reference": "Isa. 44:8",
    "category": "Maha-vavolombelona",
    "bookId": 23,
    "bookName": "Isaia",
    "chapter": 44,
    "verse": 8
  },
  {
    "id": 75,
    "reference": "Isa. 60:1",
    "category": "Maha-vavolombelona",
    "bookId": 23,
    "bookName": "Isaia",
    "chapter": 60,
    "verse": 1
  },
  {
    "id": 76,
    "reference": "2 Kôr. 5:18",
    "category": "Maha-vavolombelona",
    "bookId": 47,
    "bookName": "2 Korintiana",
    "chapter": 5,
    "verse": 18
  },
  {
    "id": 77,
    "reference": "Jer. 1:7",
    "category": "Maha-vavolombelona",
    "bookId": 24,
    "bookName": "Jeremia",
    "chapter": 1,
    "verse": 7
  },
  {
    "id": 78,
    "reference": "Asa. 1:8",
    "category": "Maha-vavolombelona",
    "bookId": 44,
    "bookName": "Asan'ny Apostoly",
    "chapter": 1,
    "verse": 8
  },
  {
    "id": 79,
    "reference": "1 Pet. 2:9",
    "category": "Maha-vavolombelona",
    "bookId": 60,
    "bookName": "1 Petera",
    "chapter": 2,
    "verse": 9
  },
  {
    "id": 80,
    "reference": "1 Pet. 3:15",
    "category": "Maha-vavolombelona",
    "bookId": 60,
    "bookName": "1 Petera",
    "chapter": 3,
    "verse": 15
  }
];

export const getRandomVerseReference = (): VerseReference => {
  const randomIndex = Math.floor(Math.random() * versesData.length);
  return versesData[randomIndex];
};

export const getVerseReferenceById = (id: number): VerseReference | undefined => {
  return versesData.find(verse => verse.id === id);
};

export const getVerseReferencesByCategory = (category: string): VerseReference[] => {
  return versesData.filter(verse => verse.category === category);
};

export const getAllVerseReferences = (): VerseReference[] => {
  return versesData;
};
