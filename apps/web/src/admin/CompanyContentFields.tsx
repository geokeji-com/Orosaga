import type {
  CompanyContentPayload,
  PortalContentPayload,
} from "@orosaga/contracts";

type CompanyCard = CompanyContentPayload["solution"]["layers"][number];
type CompanyFact = CompanyContentPayload["facts"][number];
type SectionKey =
  | "whyGeo"
  | "solution"
  | "delivery"
  | "customers"
  | "proof"
  | "remember"
  | "faq";

type Props = {
  content: CompanyContentPayload;
  setDraft: (content: PortalContentPayload) => void;
};

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label>
      {label}
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

function updateAt<T>(items: T[], index: number, value: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? value : item));
}

function FactsEditor({
  title,
  facts,
  onChange,
}: {
  title: string;
  facts: CompanyFact[];
  onChange: (facts: CompanyFact[]) => void;
}) {
  return (
    <fieldset>
      <legend>{title}</legend>
      {facts.map((fact, index) => (
        <div className="admin-company-item" key={`${title}-${index}`}>
          <Field
            label="标签"
            value={fact.label}
            onChange={(label) =>
              onChange(updateAt(facts, index, { ...fact, label }))
            }
          />
          <Field
            label="内容"
            value={fact.value}
            onChange={(value) =>
              onChange(updateAt(facts, index, { ...fact, value }))
            }
            multiline
          />
        </div>
      ))}
    </fieldset>
  );
}

function CardsEditor({
  title,
  cards,
  onChange,
}: {
  title: string;
  cards: CompanyCard[];
  onChange: (cards: CompanyCard[]) => void;
}) {
  const update = (
    index: number,
    card: CompanyCard,
    field: keyof CompanyCard,
    value: string,
  ) => onChange(updateAt(cards, index, { ...card, [field]: value }));
  return (
    <fieldset>
      <legend>{title}</legend>
      {cards.map((card, index) => (
        <div className="admin-company-item" key={`${title}-${index}`}>
          <Field
            label="标题"
            value={card.title}
            onChange={(value) => update(index, card, "title", value)}
          />
          <Field
            label="副标题"
            value={card.subtitle ?? ""}
            onChange={(value) => update(index, card, "subtitle", value)}
          />
          <Field
            label="说明"
            value={card.description}
            onChange={(value) => update(index, card, "description", value)}
            multiline
          />
          <Field
            label="产物"
            value={card.output ?? ""}
            onChange={(value) => update(index, card, "output", value)}
          />
          <Field
            label="数值"
            value={card.value ?? ""}
            onChange={(value) => update(index, card, "value", value)}
          />
          <Field
            label="补充信息"
            value={card.meta ?? ""}
            onChange={(value) => update(index, card, "meta", value)}
          />
        </div>
      ))}
    </fieldset>
  );
}

function SectionHeading({
  label,
  section,
  onChange,
}: {
  label: string;
  section: CompanyContentPayload[SectionKey];
  onChange: (heading: typeof section.heading) => void;
}) {
  return (
    <fieldset>
      <legend>{label} · 标题区</legend>
      <Field
        label="眉题"
        value={section.heading.kicker}
        onChange={(kicker) => onChange({ ...section.heading, kicker })}
      />
      <Field
        label="标题"
        value={section.heading.title}
        onChange={(title) => onChange({ ...section.heading, title })}
      />
      <Field
        label="说明"
        value={section.heading.description ?? ""}
        onChange={(description) =>
          onChange({ ...section.heading, description })
        }
        multiline
      />
    </fieldset>
  );
}

export function CompanyContentFields({ content, setDraft }: Props) {
  const setSection = <K extends SectionKey>(
    key: K,
    value: CompanyContentPayload[K],
  ) => setDraft({ ...content, [key]: value });
  return (
    <fieldset className="admin-company-fields">
      <legend>公司页专用结构</legend>
      <Field
        label="页面眉题"
        value={content.eyebrow}
        onChange={(eyebrow) => setDraft({ ...content, eyebrow })}
      />
      <fieldset>
        <legend>来源</legend>
        {(["label", "name", "date"] as const).map((field) => (
          <Field
            key={field}
            label={{ label: "标签", name: "来源名", date: "来源日期" }[field]}
            value={content.source[field]}
            onChange={(value) =>
              setDraft({
                ...content,
                source: { ...content.source, [field]: value },
              })
            }
          />
        ))}
      </fieldset>
      <fieldset>
        <legend>30 秒定义</legend>
        <Field
          label="标签"
          value={content.definition.label}
          onChange={(label) =>
            setDraft({
              ...content,
              definition: { ...content.definition, label },
            })
          }
        />
        <Field
          label="定义"
          value={content.definition.title}
          onChange={(title) =>
            setDraft({
              ...content,
              definition: { ...content.definition, title },
            })
          }
          multiline
        />
        <Field
          label="说明"
          value={content.definition.description}
          onChange={(description) =>
            setDraft({
              ...content,
              definition: { ...content.definition, description },
            })
          }
          multiline
        />
      </fieldset>
      <FactsEditor
        title="公司事实"
        facts={content.facts}
        onChange={(facts) => setDraft({ ...content, facts })}
      />
      <SectionHeading
        label="为什么做 GEO"
        section={content.whyGeo}
        onChange={(heading) =>
          setSection("whyGeo", { ...content.whyGeo, heading })
        }
      />
      <CardsEditor
        title="用户旅程"
        cards={content.whyGeo.journey}
        onChange={(journey) =>
          setSection("whyGeo", { ...content.whyGeo, journey })
        }
      />
      <Field
        label="GEO 定义"
        value={content.whyGeo.definition}
        onChange={(definition) =>
          setSection("whyGeo", { ...content.whyGeo, definition })
        }
        multiline
      />
      <SectionHeading
        label="解决方案"
        section={content.solution}
        onChange={(heading) =>
          setSection("solution", { ...content.solution, heading })
        }
      />
      <CardsEditor
        title="解决方案层级"
        cards={content.solution.layers}
        onChange={(layers) =>
          setSection("solution", { ...content.solution, layers })
        }
      />
      <CardsEditor
        title="增长飞轮"
        cards={content.solution.wheels}
        onChange={(wheels) =>
          setSection("solution", { ...content.solution, wheels })
        }
      />
      <CardsEditor
        title="系统能力"
        cards={content.solution.systems}
        onChange={(systems) =>
          setSection("solution", { ...content.solution, systems })
        }
      />
      <SectionHeading
        label="交付路径"
        section={content.delivery}
        onChange={(heading) =>
          setSection("delivery", { ...content.delivery, heading })
        }
      />
      <CardsEditor
        title="交付步骤"
        cards={content.delivery.steps}
        onChange={(steps) =>
          setSection("delivery", { ...content.delivery, steps })
        }
      />
      <CardsEditor
        title="衡量指标"
        cards={content.delivery.metrics}
        onChange={(metrics) =>
          setSection("delivery", { ...content.delivery, metrics })
        }
      />
      <SectionHeading
        label="客户与服务"
        section={content.customers}
        onChange={(heading) =>
          setSection("customers", { ...content.customers, heading })
        }
      />
      <CardsEditor
        title="适配客户"
        cards={content.customers.fit}
        onChange={(fit) =>
          setSection("customers", { ...content.customers, fit })
        }
      />
      <CardsEditor
        title="服务模式"
        cards={content.customers.modes}
        onChange={(modes) =>
          setSection("customers", { ...content.customers, modes })
        }
      />
      <Field
        label="客户说明"
        value={content.customers.note}
        onChange={(note) =>
          setSection("customers", { ...content.customers, note })
        }
        multiline
      />
      <SectionHeading
        label="结果与边界"
        section={content.proof}
        onChange={(heading) =>
          setSection("proof", { ...content.proof, heading })
        }
      />
      <FactsEditor
        title="效果数据"
        facts={content.proof.stats}
        onChange={(stats) => setSection("proof", { ...content.proof, stats })}
      />
      <CardsEditor
        title="案例"
        cards={content.proof.cases}
        onChange={(cases) => setSection("proof", { ...content.proof, cases })}
      />
      <Field
        label="数据声明"
        value={content.proof.disclaimer}
        onChange={(disclaimer) =>
          setSection("proof", { ...content.proof, disclaimer })
        }
        multiline
      />
      <CardsEditor
        title="服务边界"
        cards={content.proof.boundaries}
        onChange={(boundaries) =>
          setSection("proof", { ...content.proof, boundaries })
        }
      />
      <FactsEditor
        title="里程碑"
        facts={content.proof.milestones}
        onChange={(milestones) =>
          setSection("proof", { ...content.proof, milestones })
        }
      />
      <SectionHeading
        label="记住我们"
        section={content.remember}
        onChange={(heading) =>
          setSection("remember", { ...content.remember, heading })
        }
      />
      <fieldset>
        <legend>关键信息</legend>
        {content.remember.facts.map((fact, index) => (
          <Field
            key={`remember-${index}`}
            label={`信息 ${index + 1}`}
            value={fact}
            onChange={(value) =>
              setSection("remember", {
                ...content.remember,
                facts: updateAt(content.remember.facts, index, value),
              })
            }
            multiline
          />
        ))}
      </fieldset>
      <SectionHeading
        label="常见问题"
        section={content.faq}
        onChange={(heading) => setSection("faq", { ...content.faq, heading })}
      />
      <fieldset>
        <legend>问答</legend>
        {content.faq.items.map((item, index) => (
          <div className="admin-company-item" key={`faq-${index}`}>
            <Field
              label="问题"
              value={item.question}
              onChange={(question) =>
                setSection("faq", {
                  ...content.faq,
                  items: updateAt(content.faq.items, index, {
                    ...item,
                    question,
                  }),
                })
              }
            />
            <Field
              label="回答"
              value={item.answer}
              onChange={(answer) =>
                setSection("faq", {
                  ...content.faq,
                  items: updateAt(content.faq.items, index, {
                    ...item,
                    answer,
                  }),
                })
              }
              multiline
            />
          </div>
        ))}
      </fieldset>
    </fieldset>
  );
}
