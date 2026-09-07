import HomieLogo from "../../../../HomieLogo";

export default function ListingMappingPage() {
  return (
    <main className="mapping-editor-page">
      <header>
        <a href="/app" aria-label="Back to Homie">
          <HomieLogo variant="mark-adaptive" />
        </a>
        <a href="/app">Back to listing</a>
      </header>
      <section>
        <p>Home mapping</p>
        <h1>Mapping editor</h1>
        <span>The dedicated mapping workspace will be built here next.</span>
      </section>
    </main>
  );
}
