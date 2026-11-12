/**
 * The negative controls for SPEC 2.1, run on a page that has never been touched:
 * pushing Translate with the AI engine selected and no provider must send nothing,
 * must not spin, must show the localized providerRequiredError, and the empty
 * surface must not carry OpenAI's endpoint or model.
 *
 * Returns the evidence (recorded in the payload) plus the leak list; the caller
 * decides whether a non-empty leak set is a failure.
 */
export async function runEmptyControls(openPage, browser, server, fixture, cache) {
  const pageOrigin = server.origin;
  const requests = [];
  const openFresh = () =>
    openPage(browser, pageOrigin, fixture, { storage: { "dualtran.modelsdev.v2": JSON.stringify(cache) } });

  // The surface, read before anything is driven: no OpenAI endpoint/model anywhere.
  const probe = await openFresh();
  const surface = await probe.page.evaluate(() => {
    const ids = ["aiProvider", "aiModelSelect", "aiReasoning", "aiBaseUrl", "aiModel", "aiApiKey", "translate"];
    return ids
      .map((id) => document.getElementById(id))
      .map((node) => ({
        id: node.id,
        value: node.value,
        placeholder: node.getAttribute("placeholder") || "",
        title: node.getAttribute("title") || "",
        options: node.options ? Array.from(node.options).map((o) => o.value + "\u0000" + o.textContent) : [],
      }));
  });
  await probe.context.close();
  const openAiArtifacts = surface
    .filter((node) =>
      // `gpt-4` only counts as OpenAI's default model here, not as a catalogue entry:
      // the empty state has no model list at all, so any hit is a real leak.
      /api\.openai\.com|gpt-4o|gpt-4|gpt-3\.5/i.test([node.value, node.placeholder, node.title, ...node.options].join("\n"))
    )
    .map((node) => node.id);

  // A page that has never chosen a provider: select the AI engine, press Translate.
  const attemptPage = await openFresh();
  attemptPage.page.on("request", (request) => {
    if (request.url().startsWith(pageOrigin)) return; // the page's own assets
    requests.push(request.url());
  });
  const attempt = await attemptPage.page.evaluate(async () => {
    // There must be text, or the page stops at "nothing to translate" and the
    // provider guard is never reached.
    document.getElementById("input").value = "Hello world";
    const apiKey = document.getElementById("aiApiKey");
    apiKey.value = "sk-should-never-be-sent";
    apiKey.dispatchEvent(new Event("change"));
    const engine = document.getElementById("engine");
    engine.value = "ai";
    engine.dispatchEvent(new Event("change"));
    const blocked = {
      disabled: document.getElementById("translate").disabled,
      title: document.getElementById("translate").getAttribute("title"),
    };
    // Push it anyway: a disabled button must not be the only defence.
    document.getElementById("translate").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 400));
    const status = document.getElementById("status");
    return {
      blocked,
      providerValue: document.getElementById("aiProvider").value,
      status: status.textContent.trim(),
      statusIsError: status.classList.contains("error"),
      busy: status.classList.contains("busy"),
      result: document.getElementById("result").textContent.trim(),
    };
  });
  await attemptPage.context.close();

  // Only a translation would count: the engine switch itself sends nothing.
  const networkCalls = requests.filter((url) => /chat\/completions|translate_a\/single/.test(url));
  return {
    emptyRequestUrls: networkCalls,
    requestCount: networkCalls.length,
    blockedButton: attempt.blocked,
    providerValue: attempt.providerValue,
    status: attempt.status,
    statusIsError: attempt.statusIsError,
    busy: attempt.busy,
    result: attempt.result,
    openAiArtifacts,
  };
}
