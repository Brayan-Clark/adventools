const text = `I Dokotera John Cheyne, na dia nahatratra toerana ambony teo amin’ny asany aza, dia tsy nanadino ny adidiny teo anatrehan’Andriamanitra. Izao no nosoratany tamin’ny namany indray mandeha: “Mety tianao ho fantatra izay ao an-tsaiko. Mietry eo amin’ny vovoka aho amin’ny fiheverana fa tsy misy asa na dia iray aza amin’ny fiainako izay mahazaka ny fijerin’Ilay Andriamanitra masina. Kanefa aho misaintsaina ny fanasan’ny Mpanavotra hoe: ‘Mankanesa aty Amiko,’ ary ekeko izany fanasana izany; ary ankoatra izany, dia milaza ny feon’ny fieritreretako fa iriko mafy ny hampifanaraka ny sitrapoko amin’ny an’Andriamanitra, ka mahatsapa fiadanana aho. Omena ahy ilay fitsaharana nampanantenain’Ilay tsy nahitana fitaka tao Aminy.”

 Talohan’ny nahafatesan’ity dokotera malaza ity dia nanafatra izy ny hananganana tsangambato iray eo anilan’ny fasany, izay hanoratana izao andalan-teny izao (...): “Fa toy izao no nitiavan’Andriamanitra izao tontolo izao: nomeny ny Zanani-lahy Tokana, mba tsy ho very izay rehetra mino Azy, fa hanana fiainana mandrakizay.”- Jao. 3:16. “Mankanesa aty amiko, hianareo rehetra izay miasa fatratra sy mavesatra entana, fa Izaho no hanome anareo fitsaharana.”- Mat. 11:28. “Miezaha mitady fihavanana amin’ny olona rehetra ary fahamasinana; fa izay tsy manam-pahamasinana dia tsy hahita ny Tompo.”- Heb. 12:14.

 (...) Nesorin’i Dokotera Cheyne tsy ho eo amin’ilay tsangambato ny anarany. Toa te hilaza amin’izay mandalo eo anilan’ny fasany izy hoe: “Ny anarana sy ny asa ary ny taonan’ny lehilahy milevina ato dia tsy misy antony loatra, saingy mety ho tena zava-dehibe aminao ny mahafantatra fa noho ny fahasoavan’Andriamanitra dia nasaina nibanjina an’i Jesosy Tompo Ilay hany Mpamonjy ny mpanota izy, ary izany fibanjinana an’i Jesosy izany no nitondra fiadanam-po ho azy.” (...)

 Izany tsangambato izany dia nokendrena hampitodika ny sain’ny rehetra amin’Andriamanitra ary hampiala ny fijeriny amin’ilay olona.(...)`;

const splitIntoSentences = (text) => {
  return text.match(/[^.!?]+[.!?]+[\s"”’»>)]*|.+/g) || [text];
};

text.split('\n').filter(p => p.trim() !== '').forEach((p, i) => {
  console.log(`Paragraph ${i}:`);
  const sentences = splitIntoSentences(p);
  sentences.forEach((s, j) => {
    console.log(`  Sentence ${j}: ${s}`);
  });
  console.log(`  RECONSTRUCTED: ${sentences.join('') === p ? "MATCH" : "FAIL"}`);
  if (sentences.join('') !== p) {
    console.log(`    Expected: ${p}`);
    console.log(`    Got:      ${sentences.join('')}`);
  }
});
