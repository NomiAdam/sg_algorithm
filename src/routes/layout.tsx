import { component$, Slot } from "@builder.io/qwik";

export default component$(() => {
  return (
    <main class="h-screen w-screen bg-gradient-to-r from-cyan-500 to-blue-500">
      <section>
        <Slot />
      </section>
    </main>
  );
});
