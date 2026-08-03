import type { CSSProperties } from "react";
import type { CourseStep } from "@orosaga/contracts";
import { Route } from "lucide-react";

type CourseModel = NonNullable<CourseStep["model"]>;

export function CourseVisualModel({ model }: { model: CourseModel }) {
  const titleId = `course-model-${model.layout}-title`;
  const captionId = `course-model-${model.layout}-caption`;

  return (
    <figure
      className={`course-model course-model-layout-${model.layout}`}
      data-model-layout={model.layout}
      aria-labelledby={titleId}
      aria-describedby={captionId}
    >
      <figcaption>
        <span className="course-model-mark" aria-hidden="true">
          <Route size={18} />
        </span>
        <span className="course-model-heading">
          <span>{model.category}</span>
          <strong id={titleId}>{model.title}</strong>
          <small>{model.readingHint}</small>
        </span>
      </figcaption>

      <div className="course-model-stage">
        <ol
          aria-label={`${model.title}。${model.readingHint}。共 ${model.nodes.length} 个节点`}
        >
          {model.nodes.map((node, index) => (
            <li
              className={`course-model-node tone-${node.tone}`}
              key={node.key}
              style={{ "--model-node-index": index } as CSSProperties}
            >
              <span className="course-model-node-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="course-model-node-copy">
                <strong>{node.label}</strong>
                <small>{node.description}</small>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <p className="course-model-caption" id={captionId}>
        <span>带走一句</span>
        {model.caption}
      </p>
    </figure>
  );
}
