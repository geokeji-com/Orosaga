import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  MessageSquareText,
  Trophy,
} from "lucide-react";
import type { SaveCourseFeedback } from "@orosaga/contracts";
import { courseApi } from "../lib/course-api";
import { CourseChrome, CoursePageState } from "./CourseChrome";

const ratingOptions = [
  { value: 5, label: "5 · 很好" },
  { value: 4, label: "4 · 较好" },
  { value: 3, label: "3 · 一般" },
  { value: 2, label: "2 · 较弱" },
  { value: 1, label: "1 · 很弱" },
];

export default function CourseCompletionPage() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const course = useQuery({
    queryKey: ["course", "geo-foundations"],
    queryFn: courseApi.detail,
  });
  const enrollmentId = course.data?.enrollment?.id;
  const completion = useQuery({
    queryKey: ["course-completion", enrollmentId],
    queryFn: () => courseApi.completion(enrollmentId!),
    enabled: Boolean(enrollmentId),
  });
  const feedback = useMutation({
    mutationFn: (value: SaveCourseFeedback) =>
      courseApi.saveFeedback(enrollmentId!, value),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({
        queryKey: ["course-completion", enrollmentId],
      });
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    feedback.mutate({
      usefulness: Number(form.get("usefulness")),
      clarity: Number(form.get("clarity")),
      difficulty: Number(form.get("difficulty")),
      recommendation: Number(form.get("recommendation")),
      mostHelpfulLessonKey:
        String(form.get("mostHelpfulLessonKey") ?? "") || null,
      comment: String(form.get("comment") ?? ""),
    });
  };

  if (course.isPending || (enrollmentId && completion.isPending)) {
    return (
      <CourseChrome backHref="/courses" backLabel="返回学习中心">
        <CoursePageState title="正在核对学习记录" detail="你的进度马上就好。" />
      </CourseChrome>
    );
  }

  if (
    course.isError ||
    !course.data?.enrollment ||
    completion.isError ||
    !completion.data
  ) {
    return (
      <CourseChrome backHref="/courses" backLabel="返回学习中心">
        <CoursePageState
          title="暂时找不到结业记录"
          detail="请先进入课程完成学习，已有进度会自动保留。"
          action={
            <a
              className="course-button course-button-primary"
              href="/courses/geo-foundations"
            >
              查看课程
            </a>
          }
        />
      </CourseChrome>
    );
  }

  const detail = course.data;
  const enrollment = detail.enrollment!;
  const result = completion.data;
  if (!result.completed) {
    return (
      <CourseChrome backHref="/courses" backLabel="返回学习中心">
        <CoursePageState
          title="课程还在进行中"
          detail={`已经完成 ${result.completedLessons} / ${result.lessonCount} 节，继续走完剩余内容就能留下完整结业记录。`}
          action={
            <a
              className="course-button course-button-primary"
              href={enrollment.continueHref ?? "/courses/geo-foundations"}
            >
              继续学习
              <ArrowRight size={17} aria-hidden="true" />
            </a>
          }
        />
      </CourseChrome>
    );
  }

  const feedbackDone = result.feedbackSubmitted || saved;

  return (
    <CourseChrome backHref="/courses" backLabel="返回学习中心">
      <main className="course-completion">
        <section className="course-completion-hero">
          <span className="course-completion-icon" aria-hidden="true">
            <Trophy size={32} />
          </span>
          <p className="course-card-eyebrow">课程已完成</p>
          <h1>20 节 GEO 实战学习已记录</h1>
          <p>
            你已经从业务认知走到项目运营。课程进度和结业状态已经保存在学习中心，可以随时回来复习。
          </p>
          <div className="course-completion-stats">
            <span>
              <strong>20 / 20</strong>
              完成小节
            </span>
            <span>
              <strong>60 / 60</strong>
              完成步骤
            </span>
            <span>
              <strong>试学版</strong>
              当前课程版本
            </span>
          </div>
        </section>

        <div className="course-completion-grid">
          <section
            className="course-feedback-card"
            aria-labelledby="course-feedback-title"
          >
            {feedbackDone ? (
              <div className="course-feedback-saved">
                <CheckCircle2 size={34} aria-hidden="true" />
                <h2 id="course-feedback-title">评价已经收到</h2>
                <p>
                  感谢你的真实反馈，它会用于下一版课程内容与学习体验的完善。
                </p>
                <a
                  className="course-button course-button-secondary"
                  href="/courses"
                >
                  返回学习中心
                </a>
              </div>
            ) : (
              <>
                <div className="course-feedback-card-heading">
                  <MessageSquareText size={22} aria-hidden="true" />
                  <div>
                    <span>约 1 分钟</span>
                    <h2 id="course-feedback-title">这门课对你有帮助吗？</h2>
                  </div>
                </div>
                <form onSubmit={submit}>
                  <div className="course-rating-grid">
                    <label>
                      <span>内容实用性</span>
                      <select name="usefulness" defaultValue="5" required>
                        {ratingOptions.map((item) => (
                          <option value={item.value} key={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>表达清晰度</span>
                      <select name="clarity" defaultValue="5" required>
                        {ratingOptions.map((item) => (
                          <option value={item.value} key={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>难度适合度</span>
                      <select name="difficulty" defaultValue="4" required>
                        {ratingOptions.map((item) => (
                          <option value={item.value} key={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>推荐意愿</span>
                      <select name="recommendation" defaultValue="5" required>
                        {ratingOptions.map((item) => (
                          <option value={item.value} key={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="course-form-field">
                    <span>哪一节对你最有帮助？</span>
                    <select name="mostHelpfulLessonKey" defaultValue="">
                      <option value="">暂不选择</option>
                      {detail.chapters
                        .flatMap((chapter) => chapter.lessons)
                        .map((lesson) => (
                          <option value={lesson.key} key={lesson.key}>
                            {lesson.number}. {lesson.title}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="course-form-field">
                    <span>还想告诉我们什么？</span>
                    <textarea
                      name="comment"
                      maxLength={2000}
                      rows={4}
                      placeholder="可以写下最有收获、最困惑，或希望补充的内容。"
                    />
                  </label>
                  <button
                    className="course-button course-button-primary"
                    type="submit"
                    disabled={feedback.isPending}
                  >
                    {feedback.isPending ? "正在提交…" : "提交评价"}
                  </button>
                  {feedback.isError && (
                    <p className="course-inline-error" role="alert">
                      评价暂时没有保存，请稍后再试。
                    </p>
                  )}
                </form>
              </>
            )}
          </section>

          <aside className="course-certificate-card">
            <span>结业凭证</span>
            <h2>试学记录已保留</h2>
            <p>{result.certificate.reason}</p>
            <a
              className="course-button course-button-secondary"
              href="/courses/geo-foundations/certificate"
            >
              查看凭证规则
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </aside>
        </div>
      </main>
    </CourseChrome>
  );
}
