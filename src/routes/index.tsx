import {
  component$,
  useStore,
  useSignal,
  useResource$,
  Resource,
  useWatch$,
} from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

interface IState {
  bonus: number;
  malus: number;
  count: number;
  score: number;
  finish: number;
  victoria: number;
  multiplication: number;
}

export const BONUS = 1;
export const MALUS = -0.5;
export const COUNT = 20;
export const SCORE = 0;
export const FINISH = 5;
export const VICTORIA = 3;
export const MULTIPLICATION = 5;

export const onlyUnique = (
  value: "P" | "D",
  index: number,
  self: ("P" | "D")[]
) => self.indexOf(value) === index;

export default component$(() => {
  const score = useSignal<("D" | "P")[]>([]);
  const state = useStore<IState>({
    bonus: BONUS,
    malus: MALUS,
    count: COUNT,
    score: SCORE,
    finish: FINISH,
    victoria: VICTORIA,
    multiplication: MULTIPLICATION,
  });

  useWatch$(({ track }) => {
    track(score, "value");
    track(state, "malus");
    track(state, "bonus");
    track(state, "count");
    if (
      score.value.filter(onlyUnique).length === 1 &&
      score.value.at(0) == "P"
    ) {
      state.score = state.count;
      return;
    }
    state.score = score.value.reduce(
      (acc, value) => acc + (value === "P" ? state.bonus : state.malus),
      0
    );
  });

  const nextPosition = useResource$<number>(({ track }) => {
    track(state, "score");
    track(state, "count");
    track(state, "victoria");
    track(state, "multiplication");

    if (state.score > state.victoria) {
      return state.count;
    }
    return Math.max(
      Math.min(state.count, state.score * state.multiplication),
      1
    );
  });

  const isVictoriaDeck = useResource$<boolean>(({ track }) => {
    track(state, "score");
    track(state, "victoria");
    return state.score > state.victoria;
  });

  return (
    <div class="min-h-screen w-full flex justify-center items-center">
      <div class="p-20 min-w-[50%] rounded-xl bg-clip-padding backdrop-filter backdrop-blur-xl bg-opacity-60 border border-gray-200">
        <h1 class="text-white text-center font-bold text-6xl mb-8">
          SGA <span>🧠</span>
        </h1>
        <div>
          <div class="mb-4">
            <label
              for="finishThreshold"
              class="block text-sm font-medium text-white"
            >
              Hranice dokončení
            </label>
            <input
              type="number"
              name="finishThreshold"
              id="finishThreshold"
              min={0}
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
              name="victoriaThreshold"
              id="victoriaThreshold"
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
            <label
              for="multiplication"
              class="block text-sm font-medium text-white"
            >
              Pozice x hodnocení
            </label>
            <input
              type="number"
              name="multiplication"
              id="multiplication"
              step=".1"
              min={0}
              value={state.multiplication}
              onInput$={(ev) => {
                state.multiplication = parseInt(
                  (ev.target as HTMLInputElement).value
                );
              }}
              class="mt-2 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div class="mb-4">
            <label for="bonus" class="block text-sm font-medium text-white">
              Bonus
            </label>
            <input
              type="number"
              name="bonus"
              id="bonus"
              step=".1"
              value={state.bonus}
              onInput$={(ev) => {
                state.bonus = parseInt((ev.target as HTMLInputElement).value);
              }}
              class="mt-2 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div class="mb-4">
            <label for="malues" class="block text-sm font-medium text-white">
              Malus
            </label>
            <input
              type="number"
              name="malus"
              id="malues"
              step=".1"
              value={state.malus}
              onInput$={(ev) =>
                (state.malus = parseInt((ev.target as HTMLInputElement).value))
              }
              class="mt-2 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div class="mb-4">
            <label for="bonus" class="block text-sm font-medium text-white">
              Počet kartiček
            </label>
            <input
              type="number"
              name="bonus"
              id="bonus"
              value={state.count}
              onInput$={(ev) =>
                (state.count = parseInt((ev.target as HTMLInputElement).value))
              }
              class="mt-2 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>
        <div class="my-12 text-center">
          <h2 class="font-bold tracking-tight text-gray-900">
            <span class="block text-2xl text-white">
              Pozice:{" "}
              <Resource
                value={nextPosition}
                onPending={() => <div>0</div>}
                onRejected={() => <div>0</div>}
                onResolved={(position) => <>{position.toString()}</>}
              />
            </span>
            <span class="block text-2xl text-white mb-2">
              Hodnocení: {state.score}
            </span>
            <span class="block text-indigo-600 text-lg">
              {score.value.join("")}
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
        <div class="flex items-center justify-center">
          <div class="inline-flex rounded-md shadow">
            <button
              onClick$={() => (score.value = [...score.value, "P"])}
              class="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-5 py-3 text-base font-medium text-white hover:bg-indigo-700"
            >
              Později
            </button>
          </div>
          <div class="ml-3 inline-flex rounded-md shadow">
            <button
              onClick$={() => (score.value = [...score.value, "D"])}
              class="inline-flex items-center justify-center rounded-md border border-transparent bg-white px-5 py-3 text-base font-medium text-indigo-600 hover:bg-indigo-50"
            >
              Dříve
            </button>
          </div>
        </div>
        <span
          class="text-white inline-block mt-4 w-full text-center underline cursor-pointer"
          onClick$={() => {
            state.bonus = BONUS;
            state.malus = MALUS;
            state.count = COUNT;
            state.score = SCORE;
            state.finish = FINISH;
            state.victoria = VICTORIA;
            state.multiplication = MULTIPLICATION;
            score.value = [];
          }}
        >
          Reset
        </span>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "SGA",
};
