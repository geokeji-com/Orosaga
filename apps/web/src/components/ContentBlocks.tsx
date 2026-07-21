import type { ContentPayload } from "@orosaga/contracts";

export function ContentBlocks({ content }: { content: ContentPayload }) {
  return (
    <>
      {content.blocks.map((block, index) => {
        if (block.type === "text")
          return (
            <section className="content-block" key={index}>
              {block.heading && <h2>{block.heading}</h2>}
              <p>{block.body}</p>
            </section>
          );
        if (block.type === "metrics")
          return (
            <section className="content-metrics" key={index}>
              {block.items.map((item) => (
                <dl key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </dl>
              ))}
            </section>
          );
        if (block.type === "cards")
          return (
            <section className="content-cards" key={index}>
              {block.items.map((item) => (
                <article key={item.title}>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                  {item.href && <a href={item.href}>继续阅读</a>}
                </article>
              ))}
            </section>
          );
        return (
          <section className="content-faq" key={index}>
            {block.items.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </section>
        );
      })}
    </>
  );
}
