// Cartoonix feedback survey — questions grouped by section.
// type: "single" (one choice) | "multi" (checkboxes) | "text" (free answer)

export const FEEDBACK_SECTIONS = [
  {
    key: "recompense",
    title: "Feedback Cartoonix",
    emoji: "🎯",
    accent: "#ec1c24",
    questions: [
      {
        id: "q1", type: "single",
        q: "Cum ți se pare sistemul de recompense de pe Cartoonix?",
        options: ["⭐ Foarte bun", "👍 Bun", "😐 Se poate îmbunătăți", "👎 Nu îmi place", "💡 Aș schimba mai multe lucruri"],
      },
      {
        id: "q2", type: "text",
        q: "Ai schimba ceva la sistemul de recompense? Dacă da, ce ai schimba?",
        placeholder: "Răspunsul tău...",
      },
      {
        id: "q3", type: "single",
        q: "Cum ți se pare moneda NIX și ideea de a o putea schimba în premii reale?",
        options: ["🔥 Îmi place foarte mult", "👍 Este o idee bună", "😐 Nu mă interesează prea mult", "💡 Aș prefera alte metode de recompensare"],
      },
      {
        id: "q4", type: "single",
        q: "Cum ți se pare sistemul Mystery Box? 🎁",
        options: ["🔥 Foarte interesant", "👍 Îmi place", "😐 Este ok", "👎 Nu mă atrage"],
      },
      {
        id: "q5", type: "single",
        q: "Cum ți se pare faptul că poți obține chei pentru Mystery Box prin activitatea de pe Cartoonix? 🔑",
        options: ["⭐ Foarte bună idee", "👍 Îmi place", "😐 Nu contează pentru mine", "💡 Aș prefera și alte metode de a obține chei"],
      },
    ],
  },
  {
    key: "continut",
    title: "Conținut & funcții noi",
    emoji: "📺",
    accent: "#a855f7",
    questions: [
      {
        id: "q6", type: "multi",
        q: "Pe lângă desene, ce ai vrea să vezi nou pe Cartoonix?",
        options: ["🎮 Mini-jocuri", "🏆 Concursuri și evenimente", "🎁 Mai multe recompense", "💬 Mai multe funcții pentru comunitate", "🎨 Personalizare profil/avatar", "🗺️ O hartă interactivă Cartoonix", "📻 Radio / muzică", "💡 Altceva"],
      },
      {
        id: "q7", type: "text",
        q: "Ce funcție ai vrea să fie adăugată următoarea pe Cartoonix?",
        placeholder: "Răspunsul tău...",
      },
      {
        id: "q8", type: "single",
        q: "Cât de importantă este pentru tine apariția unor evenimente speciale pe Cartoonix?",
        options: ["🔥 Foarte importantă", "👍 Mi-ar plăcea", "😐 Nu contează", "👎 Nu mă interesează"],
      },
      {
        id: "q9", type: "multi",
        q: "Ce tip de evenimente ai vrea să vezi pe Cartoonix?",
        options: ["🎃 Evenimente tematice (Halloween, Crăciun etc.)", "🏆 Competiții", "🎁 Giveaway-uri", "🔍 Mistere / quest-uri", "💰 Evenimente cu NIX", "🎮 Mini-jocuri", "💡 Altele"],
      },
    ],
  },
  {
    key: "halloween",
    title: "Halloween",
    emoji: "🎃",
    accent: "#ff7a18",
    questions: [
      {
        id: "q10", type: "single",
        q: "Cum ți se pare până acum update-ul de Halloween? 🎃",
        options: ["🎃 Îmi place foarte mult", "👻 Îmi place", "😐 Este ok", "💡 Aș mai adăuga lucruri", "👎 Nu este pe gustul meu"],
      },
      {
        id: "q11", type: "text",
        q: "Ce ai vrea să mai adăugăm în cadrul evenimentelor tematice Cartoonix?",
        placeholder: "Răspunsul tău...",
      },
      {
        id: "q12", type: "single",
        q: "Ți-ar plăcea ca evenimentele sezoniere să revină în fiecare an cu elemente noi?",
        options: ["🎃 Da, sigur!", "👍 Da, dacă apar lucruri noi", "😐 Nu contează", "👎 Nu mă interesează"],
      },
    ],
  },
  {
    key: "comunitate",
    title: "Comunitate & suport",
    emoji: "💬",
    accent: "#22c55e",
    questions: [
      {
        id: "q13", type: "single",
        q: "Cum evaluezi suportul oferit de Cartoonix?",
        options: ["⭐⭐⭐⭐⭐ Foarte bun", "⭐⭐⭐⭐ Bun", "⭐⭐⭐ Acceptabil", "⭐⭐ Poate fi îmbunătățit", "⭐ Foarte slab"],
      },
      {
        id: "q14", type: "single",
        q: "Cât de ușor îți este să primești ajutor atunci când ai o problemă pe Cartoonix?",
        options: ["🟢 Foarte ușor", "🟢 Ușor", "🟡 Uneori este dificil", "🔴 Dificil"],
      },
      {
        id: "q15", type: "single",
        q: "Cum ți se pare comunitatea Cartoonix? 💬",
        options: ["🔥 Foarte activă", "👍 Activă", "😐 Aș vrea mai multă activitate", "👎 Este prea puțin activă"],
      },
      {
        id: "q16", type: "text",
        q: "Ce ai îmbunătăți la chat-ul Cartoonix?",
        placeholder: "Răspunsul tău...",
      },
    ],
  },
  {
    key: "experienta",
    title: "Experiența generală",
    emoji: "❤️",
    accent: "#ec4899",
    questions: [
      {
        id: "q17", type: "single",
        q: "Cât de des intri pe Cartoonix?",
        options: ["🔥 Zilnic", "📅 De câteva ori pe săptămână", "📅 O dată pe săptămână", "💤 Ocazional"],
      },
      {
        id: "q18", type: "multi",
        q: "Ce faci cel mai des când intri pe Cartoonix?",
        options: ["📺 Mă uit la desene", "💬 Vorbesc pe chat", "🎁 Colectez recompense", "🎃 Particip la evenimente", "🏆 Particip la concursuri", "🔎 Explorez platforma"],
      },
      {
        id: "q19", type: "single",
        q: "Cum ai evalua experiența generală pe Cartoonix?",
        options: ["⭐⭐⭐⭐⭐ Excelentă", "⭐⭐⭐⭐ Foarte bună", "⭐⭐⭐ Bună", "⭐⭐ Poate fi îmbunătățită", "⭐ Mai sunt multe lucruri de îmbunătățit"],
      },
      {
        id: "q20", type: "text",
        q: "Ce îți place cel mai mult la Cartoonix? ❤️",
        placeholder: "Răspunsul tău...",
      },
      {
        id: "q21", type: "text",
        q: "Ce lucru ai schimba sau îmbunătăți prima dată pe Cartoonix?",
        placeholder: "Răspunsul tău...",
      },
      {
        id: "q22", type: "text",
        q: "Dacă ai putea adăuga o singură funcție nouă pe Cartoonix, care ar fi aceasta? 💡",
        placeholder: "Răspunsul tău...",
      },
      {
        id: "q23", type: "single",
        q: "Ai recomanda Cartoonix unui prieten?",
        options: ["❤️ Da, sigur", "👍 Probabil da", "😐 Nu sunt sigur", "👎 Probabil nu"],
      },
      {
        id: "q24", type: "single",
        q: "Ce notă ai acorda Cartoonix în acest moment?",
        options: ["10/10 ⭐", "9/10", "8/10", "7/10", "6/10 sau mai puțin"],
      },
    ],
  },
  {
    key: "mesaj",
    title: "Mesaj pentru echipa Cartoonix",
    emoji: "🚀",
    accent: "#ffcc00",
    questions: [
      {
        id: "q25", type: "text",
        q: "Dacă ai putea transmite un singur mesaj echipei Cartoonix, ce ne-ai spune? ❤️",
        placeholder: "Mesajul tău pentru noi...",
      },
    ],
  },
];

// All question ids that must be answered (choice questions). Free-text is optional.
export const REQUIRED_QUESTION_IDS = FEEDBACK_SECTIONS
  .flatMap((s) => s.questions)
  .filter((q) => q.type !== "text")
  .map((q) => q.id);

export const TOTAL_QUESTIONS = FEEDBACK_SECTIONS.reduce((n, s) => n + s.questions.length, 0);
