import { useState } from "react";
import { createPortal } from "react-dom";
import type { AssessmentReportPayload } from "@orosaga/contracts";
import {
  BookOpenCheck,
  CheckCircle2,
  CircleMinus,
  Lightbulb,
  X,
  XCircle,
} from "lucide-react";
import {
  formatDuration,
  internalLearningPath,
  learningPathLabel,
  questionOptionLabel,
} from "./assessment-utils";
import { useDialogFocus } from "./use-dialog-focus";

type QuestionResult = AssessmentReportPayload["questionResults"][number];

const statusLabel = (question: QuestionResult) =>
  question.correct
    ? "回答正确"
    : question.selectedOptionId
      ? "回答错误"
      : "未作答";

const statusClass = (question: QuestionResult) =>
  question.correct
    ? "is-correct"
    : question.selectedOptionId
      ? "is-incorrect"
      : "is-unanswered";

function QuestionDetailDialog({
  question,
  onClose,
}: {
  question: QuestionResult;
  onClose: () => void;
}) {
  const [dialogRef, onKeyDown] = useDialogFocus<HTMLDivElement>({
    open: true,
    onClose,
  });
  return createPortal(
    <div
      className="assessment-dialog-backdrop assessment-question-detail-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-labelledby="assessment-question-detail-title"
        aria-modal="true"
        className="assessment-question-detail-dialog"
        onKeyDown={onKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="assessment-question-detail-header">
          <div>
            <span
              className={`assessment-question-status ${statusClass(question)}`}
            >
              {question.correct ? (
                <CheckCircle2 aria-hidden="true" />
              ) : question.selectedOptionId ? (
                <XCircle aria-hidden="true" />
              ) : (
                <CircleMinus aria-hidden="true" />
              )}
              {statusLabel(question)}
            </span>
            <p>
              第 {question.position} 题 · {question.stableKey}
            </p>
          </div>
          <button
            aria-label="关闭题目详情"
            data-dialog-initial-focus
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="assessment-question-detail-content">
          <h2 id="assessment-question-detail-title">{question.stem}</h2>

          <dl className="assessment-question-answer-summary">
            <div>
              <dt>你的答案</dt>
              <dd className={statusClass(question)}>
                {questionOptionLabel(question, question.selectedOptionId)}
              </dd>
            </div>
            <div>
              <dt>标准答案</dt>
              <dd className="is-correct">
                {questionOptionLabel(question, question.correctOptionId)}
              </dd>
            </div>
            <div>
              <dt>本题用时</dt>
              <dd>{formatDuration(question.activeDurationMs)}</dd>
            </div>
          </dl>

          <section aria-labelledby="assessment-question-options-title">
            <h3 id="assessment-question-options-title">选项与逐项解析</h3>
            <ol className="assessment-analysis-options assessment-question-detail-options">
              {question.options.map((option, optionIndex) => (
                <li
                  className={`${option.correct ? "is-correct" : ""} ${option.selected ? "is-selected" : ""}`}
                  key={option.id}
                >
                  <span>{optionIndex + 1}</span>
                  <div>
                    <strong>{option.text}</strong>
                    <p>{option.rationale}</p>
                  </div>
                  <small>
                    {option.correct && option.selected
                      ? "你的答案 · 标准答案"
                      : option.correct
                        ? "标准答案"
                        : option.selected
                          ? "你的答案"
                          : ""}
                  </small>
                </li>
              ))}
            </ol>
          </section>

          <div className="assessment-rationale-grid assessment-question-detail-rationale">
            <article>
              <h3>
                <Lightbulb aria-hidden="true" />
                核心原理
              </h3>
              <p>{question.coreRationale}</p>
              <ol>
                {question.reasoningSteps.map((step, index) => (
                  <li key={`${index}-${step}`}>{step}</li>
                ))}
              </ol>
            </article>
            <article>
              <h3>
                <BookOpenCheck aria-hidden="true" />
                业务应用
              </h3>
              <p>{question.businessApplication}</p>
              <dl>
                <div>
                  <dt>证据编号</dt>
                  <dd>{question.sourceIds.join("、") || "暂无"}</dd>
                </div>
                <div>
                  <dt>学习路径</dt>
                  <dd>
                    {question.learningPaths.length
                      ? question.learningPaths.map((path, index) => {
                          const href = internalLearningPath(path);
                          const label = learningPathLabel(path);
                          return href ? (
                            <a href={href} key={`${path}-${index}`}>
                              {label}
                            </a>
                          ) : (
                            <span key={`${path}-${index}`}>{label}</span>
                          );
                        })
                      : "暂无"}
                  </dd>
                </div>
              </dl>
            </article>
          </div>

          <p className="assessment-question-metadata">
            难度 {question.difficulty} · 业务重要度{" "}
            {question.businessImportance}/5 · 修改答案 {question.changeCount} 次
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function QuestionResultMap({
  questions,
}: {
  questions: QuestionResult[];
}) {
  const [selectedQuestion, setSelectedQuestion] =
    useState<QuestionResult | null>(null);

  return (
    <>
      <div
        aria-label={`${questions.length} 题结果地图，点击题号查看详情`}
        className="assessment-question-result-map"
        role="group"
      >
        {questions.map((question) => {
          return (
            <button
              aria-haspopup="dialog"
              aria-label={`第 ${question.position} 题，${statusLabel(question)}，你的答案 ${questionOptionLabel(question, question.selectedOptionId)}，标准答案 ${questionOptionLabel(question, question.correctOptionId)}，点击查看详情`}
              className={statusClass(question)}
              key={question.questionId}
              onClick={() => setSelectedQuestion(question)}
              type="button"
            >
              <strong>{question.position}</strong>
              <span>
                {questionOptionLabel(question, question.selectedOptionId)}/
                {questionOptionLabel(question, question.correctOptionId)}
              </span>
            </button>
          );
        })}
      </div>
      {selectedQuestion ? (
        <QuestionDetailDialog
          onClose={() => setSelectedQuestion(null)}
          question={selectedQuestion}
        />
      ) : null}
    </>
  );
}
