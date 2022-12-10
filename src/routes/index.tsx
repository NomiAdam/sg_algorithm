import {
  component$,
  useStore,
  useResource$,
  Resource,
  useWatch$,
  useServerMount$,
  createContext,
  useContextProvider,
  useContext,
  useSignal,
  $,
} from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

type TAnswer = "D" | "P";
type TScore = TAnswer[];
type TCardFace = "F" | "B";

interface IState {
  bonus: number;
  malus: number;
  finish: number;
  victoria: number;
  initialScore: number;
  multiplication: number;
  initialFace: TCardFace;
}

interface ITextbook {
  name: string;
  deckIds: number[];
  textbookId: number;
}

interface IDeck {
  id: number;
  name: string;
}

interface ITranslation {
  translation: string;
}

interface ICard {
  cardId: number;
  imageUrl: string;
  translations: ITranslation[];
}

interface IRemoteStore {
  decks?: IDeck[];
  cards?: ICard[];
  deckId?: number;
  textbookId?: number;
  textbooks?: ITextbook[];
}

export const BONUS = 1;
export const FINISH = 5;
export const MALUS = -0.5;
export const VICTORIA = 3;
export const INITIAL_FACE = "F";
export const MULTIPLICATION = 5;
export const INITIAL_SCORE = 1.5;

export const onlyUnique = (value: TAnswer, index: number, self: TScore) =>
  self.indexOf(value) === index;

interface ICardProps {
  card: ICard;
  index: number;
}

interface ICardState {
  positions: ICard[];
  scores: Record<number, TScore | undefined>;
}

export const StateContext = createContext<IState>("state-context");
export const CardsContext = createContext<ICardState>("cards-context");

export const CardState = component$(({ card, index }: ICardProps) => {
  const cards = useContext<ICardState>(CardsContext);
  return (
    <div class="bg-cyan-900 rounded-2xl p-4 text-center">
      <span class="block text-2xl text-white">{index + 1}</span>
      <span class="block text-2xl text-white mb-2">
        {cards.scores[card.cardId]?.join("")}
      </span>
      <div class="my-2 text-center">
        <h3 class="font-bold tracking-tight text-white">
          {card.translations.at(0)?.translation}
        </h3>
      </div>
    </div>
  );
});

export const Card = component$(({ card, index }: ICardProps) => {
  const state = useContext<IState>(StateContext);
  const cards = useContext<ICardState>(CardsContext);

  const cardFace = useSignal<TCardFace>(state.initialFace);

  const isVictoriaDeck = useResource$<boolean>(({ track }) => {
    track(cards, "scores");
    track(state, "victoria");

    const cardsCounts = cards.positions.length;
    const newCardScore = cards.scores[card.cardId] ?? [];

    const calculateCardScore = () => {
      if (
        newCardScore.filter(onlyUnique).length === 1 &&
        newCardScore.at(0) == "P"
      ) {
        return cardsCounts;
      }
      return newCardScore.reduce(
        (acc, value) => acc + (value === "P" ? state.bonus : state.malus),
        0
      );
    };

    return calculateCardScore() > state.victoria;
  });

  useWatch$(({ track }) => {
    track(cards, "scores");
    track(state, "initialFace");
    if (cardFace.value !== state.initialFace) {
      cardFace.value == state.initialFace;
    }
  });

  const arrayMove = $((arr: ICard[], nextCardPosition: number) => {
    const element = arr[index];
    arr.splice(index, 1);
    arr.splice(nextCardPosition, 0, element);
    return [...arr];
  });

  const calculateNextCardScore = $((score: TScore): TScore => {
    const stringScore = score.join("");
    if (["PD", "DPD", "DDDD"].includes(stringScore)) {
      return ["D"];
    }
    if (["DPPP", "PPPP"].includes(stringScore)) {
      return ["P"];
    }
    if (stringScore.endsWith("PPP")) {
      return ["P", "P", "P"];
    }
    return [...score];
  });

  const calculateNextCardPosition = $(async (score: TScore) => {
    const cardsCounts = cards.positions.length;

    const calculateCardScore = () => {
      if (score.filter(onlyUnique).length === 1 && score.at(0) == "P") {
        return cardsCounts;
      }
      return (
        score.reduce(
          (acc, value) => acc + (value === "P" ? state.bonus : state.malus),
          0
        ) + state.initialScore
      );
    };

    const finalNumberScore = calculateCardScore();

    if (finalNumberScore > state.victoria) {
      return cardsCounts;
    }

    return Math.max(
      Math.min(cardsCounts, finalNumberScore * state.multiplication),
      1
    );
  });

  const handleCardAnswer = $(async (answer: TAnswer) => {
    const score = cards.scores[card.cardId] ?? [];
    cards.scores[card.cardId] = await calculateNextCardScore([
      ...score,
      answer,
    ]);
    const nextCardPosition = await calculateNextCardPosition(
      cards.scores[card.cardId] ?? []
    );
    cards.positions = await arrayMove(cards.positions, nextCardPosition);
  });

  const calculateNextPosition = $(async (answer: TAnswer) => {
    const score = cards.scores[card.cardId] ?? [];
    const nextScore = await calculateNextCardScore([...score, answer]);
    return calculateNextCardPosition(nextScore).then((score) =>
      Math.round(score)
    );
  });

  const calculateNextScore = $(async () => {
    const score = cards.scores[card.cardId] ?? [];
    return (
      (await calculateNextCardScore(score)).reduce(
        (acc, value) => acc + (value === "P" ? state.bonus : state.malus),
        0
      ) + state.initialScore
    );
  });

  return (
    <div
      onClick$={() => (cardFace.value = cardFace.value === "F" ? "B" : "F")}
      class={`bg-cyan-500 p-4 ${
        index === 0 ? "block" : "hidden"
      } max-w-lg rounded-2xl`}
    >
      <div class="mb-6 text-center">
        <h2 class="font-bold tracking-tight text-gray-900">
          <span class="block text-2xl text-white mb-2">
            Hodnocení:{" "}
            {calculateNextScore().then((score) => (
              <span class="font-bold mx-2">({score})</span>
            ))}
          </span>
          <span class="block text-indigo-600 text-lg">
            {(cards.scores[card.cardId] ?? []).join("")}
          </span>
          <span class="block text-indigo-600 mt-2 underline text-sm">
            <Resource
              value={isVictoriaDeck}
              onPending={() => <div />}
              onRejected={() => <div />}
              onResolved={(isVictoria) => (
                <>{isVictoria ? "Victoria balíček" : ""}</>
              )}
            />
          </span>
        </h2>
      </div>
      <div class="my-12 text-center">
        <h3 class="font-bold tracking-tight text-white">
          Slovíčko:{" "}
          {card.translations.at(cardFace.value === "F" ? 0 : -1)?.translation}
        </h3>
      </div>
      <div class="flex items-center justify-center">
        <div class="inline-flex rounded-md shadow">
          <button
            onClick$={() => handleCardAnswer("D")}
            class="inline-flex items-center justify-center rounded-md border border-transparent bg-white px-5 py-3 text-base font-medium text-indigo-600 hover:bg-indigo-50"
          >
            Dříve
            {calculateNextPosition("D").then((position) => (
              <span class="font-bold mx-2">({position})</span>
            ))}
          </button>
        </div>
        <div class="ml-3 inline-flex rounded-md shadow">
          <button
            onClick$={() => handleCardAnswer("P")}
            class="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-5 py-3 text-base font-medium text-white hover:bg-indigo-700"
          >
            Později
            {calculateNextPosition("P").then((position) => (
              <span class="font-bold mx-2">({position})</span>
            ))}
          </button>
        </div>
      </div>
    </div>
  );
});

export default component$(() => {
  const store = useStore<IRemoteStore>({});
  useServerMount$(async () => {
    const response = await fetch(
      "https://api.studentgate.com/api/public/v1/textbooks"
    );
    store.textbooks = (await response.json()).filter(
      ({ deckIds }: ITextbook) => deckIds.length > 0
    );
  });

  useWatch$(async ({ track }) => {
    track(store, "textbookId");
    if (store.textbookId) {
      const deckIds =
        store.textbooks?.find(
          ({ textbookId }) => textbookId == store.textbookId
        )?.deckIds ?? [];
      const response = await fetch(
        `https://api.studentgate.com/api/public/v1/decks?limit=666${deckIds
          .map((deckId: any) => `&deckIds[]=${deckId}`)
          .join("")}`
      );
      store.decks = (await response.json()).data;
    }
  });

  useWatch$(async ({ track }) => {
    track(store, "deckId");
    if (store.deckId) {
      const response = await fetch(
        `https://api.studentgate.com/api/public/v1/decks/${store.deckId}/cards`
      );
      store.cards = await response.json();
    }
  });

  const state = useStore<IState>({
    bonus: BONUS,
    malus: MALUS,
    finish: FINISH,
    victoria: VICTORIA,
    initialFace: INITIAL_FACE,
    initialScore: INITIAL_SCORE,
    multiplication: MULTIPLICATION,
  });

  const cardState = useStore<ICardState>({
    scores: {},
    positions: [],
  });

  useWatch$(async ({ track }) => {
    track(state);
    track(store, "cards");
    if (store.cards && store.cards.length > 0) {
      cardState.scores = {};
      cardState.positions = [...store.cards];
    }
  });

  useContextProvider(StateContext, state);
  useContextProvider(CardsContext, cardState);

  return (
    <div class="min-h-screen w-full flex justify-center items-center">
      <div class="p-20 min-w-[50%] rounded-xl bg-clip-padding backdrop-filter backdrop-blur-xl bg-opacity-60 border border-gray-200">
        <h1 class="text-white text-center font-bold text-6xl mb-8">
          SGA <span>🧠</span>
        </h1>
        <div class="mb-20">
          <div class="mb-4">
            <label for="texbook" class="block text-sm font-medium text-white">
              Učebnice
            </label>
            <select
              name="texbook"
              id="textbook"
              value={store.textbookId}
              onInput$={(ev) =>
                (store.textbookId = parseInt(
                  (ev.target as HTMLInputElement).value
                ))
              }
              class="mt-2 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option>Vyberte učebnici</option>
              {store.textbooks?.map((textbook) => (
                <option value={textbook.textbookId}>{textbook.name}</option>
              ))}
            </select>
          </div>
          {store.decks && (
            <div class="mb-4">
              <label for="deck" class="block text-sm font-medium text-white">
                Balíček
              </label>
              <select
                id="deck"
                name="deck"
                value={store.deckId}
                onInput$={(ev) =>
                  (store.deckId = parseInt(
                    (ev.target as HTMLSelectElement).value
                  ))
                }
                class="mt-2 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option>Vyberte balíček</option>
                {store.decks?.map((deck) => (
                  <option value={deck.id}>{deck.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div>
          <div class="mb-4">
            <label
              for="finishThreshold"
              class="block text-sm font-medium text-white"
            >
              Hranice dokončení
            </label>
            <input
              min={0}
              type="number"
              id="finishThreshold"
              name="finishThreshold"
              value={state.finish}
              onInput$={(ev) =>
                (state.finish = parseInt((ev.target as HTMLInputElement).value))
              }
              class="mt-2 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div class="mb-4">
            <label
              for="victoriaThreshold"
              class="block text-sm font-medium text-white"
            >
              Hranice Victoria balíčku
            </label>
            <input
              type="number"
              id="victoriaThreshold"
              name="victoriaThreshold"
              min={0}
              value={state.victoria}
              onInput$={(ev) =>
                (state.victoria = parseInt(
                  (ev.target as HTMLInputElement).value
                ))
              }
              class="mt-2 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div class="mb-4">
            <label for="cardFace" class="block text-sm font-medium text-white">
              Počáteční strana kartičky
            </label>
            <select
              id="cardFace"
              name="cardFace"
              value={state.initialFace}
              onInput$={(ev) => {
                state.initialFace = (ev.target as HTMLSelectElement)
                  .value as TCardFace;
              }}
              class="mt-2 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {["F", "B"].map((face) => (
                <option value={face}>
                  {face === "F" ? "Přední" : "Zadní"}
                </option>
              ))}
            </select>
          </div>
          <div class="mb-4">
            <label
              for="multiplication"
              class="block text-sm font-medium text-white"
            >
              Pozice x hodnocení (pozice * hodnocení = skore kartičky)
            </label>
            <input
              type="text"
              id="multiplication"
              name="multiplication"
              value={state.multiplication.toString()}
              onInput$={(ev) => {
                const value = parseFloat((ev.target as HTMLInputElement).value);
                state.multiplication = Number.isNaN(value)
                  ? MULTIPLICATION
                  : value;
              }}
              class="mt-2 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div class="mb-4">
            <label for="bonus" class="block text-sm font-medium text-white">
              Bonus
            </label>
            <input
              type="text"
              name="bonus"
              id="bonus"
              value={state.bonus.toString()}
              onInput$={(ev) => {
                const value = parseFloat((ev.target as HTMLInputElement).value);
                state.bonus = Number.isNaN(value) ? BONUS : value;
              }}
              class="mt-2 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div class="mb-4">
            <label for="malus" class="block text-sm font-medium text-white">
              Malus
            </label>
            <input
              type="text"
              name="malus"
              id="malus"
              value={state.malus.toString()}
              onInput$={(ev) => {
                const value = parseFloat((ev.target as HTMLInputElement).value);
                state.malus = Number.isNaN(value) ? MALUS : value;
              }}
              class="mt-2 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div class="mb-4">
            <label
              for="initialScore"
              class="block text-sm font-medium text-white"
            >
              Počáteční hodnocení kartičky
            </label>
            <input
              type="text"
              id="initialScore"
              name="initialScore"
              value={state.initialScore.toString()}
              onInput$={(ev) => {
                const value = parseFloat((ev.target as HTMLInputElement).value);
                state.initialScore = Number.isNaN(value)
                  ? INITIAL_SCORE
                  : value;
              }}
              class="mt-2 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div class="my-4 flex justify-center">
          {cardState.positions.length > 0 && (
            <div>
              {cardState.positions?.map((card, index) => (
                <Card card={card} index={index} />
              ))}
            </div>
          )}
        </div>

        <div class="my-4 overflow-x-auto flex gap-4 flex-row">
          {cardState.positions.length > 0 &&
            cardState.positions?.map((card, index) => (
              <CardState card={card} index={index} />
            ))}
        </div>

        <span
          class="text-white inline-block mt-4 w-full text-center underline cursor-pointer"
          onClick$={() => {
            store.textbookId = undefined;
            store.cards = undefined;
            store.deckId = undefined;
            store.decks = undefined;
            cardState.scores = {};
            cardState.positions = [];
            state.bonus = BONUS;
            state.malus = MALUS;
            state.initialScore = INITIAL_SCORE;
            state.finish = FINISH;
            state.victoria = VICTORIA;
            state.initialFace = INITIAL_FACE;
            state.multiplication = MULTIPLICATION;
          }}
        >
          Reset
        </span>

        <article class="text-white flex flex-col gap-4">
          <h2>Pevné podmínky</h2>
          <article class="border p-4">
            <h3 class="font-bold">Podmínky pro skore</h3>
            <p>"PD", "DPD" nebo "DDDD" = "D"</p>
            <p>"DPPP" nebo "PPPP" = "P"</p>
            <p>Skore končí na kombinace "xPPP" = "PPP" (Victoria balíček)</p>
          </article>
          <article class="border p-4">
            <h3 class="font-bold">Podmínky pro pozici</h3>
            <p>
              Když se skore kartičky skládá z libovolného množství za sebou
              jdoucích <q>P</q> finální pozice je vždy <strong>Konec</strong>{" "}
              balíčku
            </p>
            <p>
              Když má kartička záporné skore je finální pozice vždy{" "}
              <strong>2</strong> (za následující kartičkou)
            </p>
          </article>
        </article>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "SGA",
};
