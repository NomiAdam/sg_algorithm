import { component$, Slot } from "@builder.io/qwik";

export default component$(() => {
  return (
    <main class="min-h-screen p-4 w-screen bg-gradient-to-r from-cyan-500 to-blue-500">
      <section>
        <Slot />
      </section>
    </main>
  );
});
