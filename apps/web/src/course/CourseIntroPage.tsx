import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Clock3, FileCheck2, Layers3 } from "lucide-react";
import { courseApi } from "../lib/course-api";
import { CourseChrome, CoursePageState } from "./CourseChrome";

export default function CourseIntroPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const enrollmentKey = useRef(crypto.randomUUID());
  const course = useQuery({
    queryKey: ["course", "geo-foundations"],
    queryFn: courseApi.detail,
  });
  const enroll = useMutation({
    mutationFn: () => courseApi.enroll(enrollmentKey.current),
    onSuccess: async (enrollment) => {
      await queryClient.invalidateQueries({ queryKey: ["course"] });
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      navigate(
        enrollment.continueHref ?? "/courses/geo-foundations/completion",
      );
    },
  });

  if (course.isPending) {
    return (
      <CourseChrome backHref="/courses" backLabel="返回学习中心">
        <CoursePageState
          title="正在展开课程大纲"
          detail="20 个小节马上呈现。"
        />
      </CourseChrome>
    );
  }
  if (course.isError || !course.data) {
    return (
      <CourseChrome backHref="/courses" backLabel="返回学习中心">
        <CoursePageState
          title="课程介绍读取失败"
          detail="请检查网络后再试一次。"
          action={
            <button
              className="course-button course-button-primary"
              type="button"
              onClick={() => void course.refetch()}
            >
              重新读取
            </button>
          }
        />
      </CourseChrome>
    );
  }

  const detail = course.data;
  const enrollment = detail.enrollment;
  const actionLabel = enrollment
    ? enrollment.status === "COMPLETED"
      ? "回看课程"
      : `继续学习 · ${enrollment.progressPercent}%`
    : detail.greeting.actionLabel;

  return (
    <CourseChrome backHref="/courses" backLabel="返回学习中心">
      <main className="course-intro">
        <section className="course-intro-hero">
          <div className="course-intro-copy">
            <div className="course-card-badges">
              <span className="course-badge course-badge-blue">全员开放</span>
              <span className="course-badge">GEO 基础必修</span>
            </div>
            <p className="course-card-eyebrow">{detail.shortTitle}</p>
            <h1>{detail.title}</h1>
            <p className="course-intro-greeting">{detail.greeting.title}</p>
            <p>{detail.greeting.detail}</p>

            <ul className="course-intro-meta" aria-label="课程概览">
              <li>
                <Layers3 size={18} aria-hidden="true" />
                <span>
                  <strong>{detail.lessonCount} 节</strong>5 个递进章节
                </span>
              </li>
              <li>
                <Clock3 size={18} aria-hidden="true" />
                <span>
                  <strong>
                    约 {Math.round(detail.estimatedMinutes / 60)} 小时
                  </strong>
                  可分多次完成
                </span>
              </li>
              <li>
                <FileCheck2 size={18} aria-hidden="true" />
                <span>
                  <strong>20 次情境练习</strong>
                  即时反馈与解析
                </span>
              </li>
            </ul>

            <button
              className="course-button course-button-primary course-button-large"
              type="button"
              disabled={enroll.isPending}
              onClick={() => {
                if (enrollment?.continueHref) {
                  navigate(enrollment.continueHref);
                  return;
                }
                if (enrollment?.status === "COMPLETED") {
                  navigate("/courses/geo-foundations/completion");
                  return;
                }
                enroll.mutate();
              }}
            >
              {enroll.isPending ? "正在准备课程…" : actionLabel}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            {enroll.isError && (
              <p className="course-inline-error" role="alert">
                暂时无法开始课程，请稍后再试。
              </p>
            )}
          </div>

          <aside className="course-intro-route" aria-label="课程学习方法">
            <span>每节课的学习节奏</span>
            <ol>
              <li>
                <i>01</i>
                <div>
                  <strong>进入业务现场</strong>
                  <p>从人物、目标和约束理解真实问题。</p>
                </div>
              </li>
              <li>
                <i>02</i>
                <div>
                  <strong>看懂移山方法</strong>
                  <p>对照常见误区，掌握模型与底层原理。</p>
                </div>
              </li>
              <li>
                <i>03</i>
                <div>
                  <strong>完成一次决策</strong>
                  <p>作答后即时查看提示和完整分析。</p>
                </div>
              </li>
            </ol>
          </aside>
        </section>

        <section
          className="course-outline-preview"
          aria-labelledby="course-outline-title"
        >
          <div className="course-section-heading">
            <div>
              <span>COURSE OUTLINE</span>
              <h2 id="course-outline-title">从认知到项目运营</h2>
            </div>
            <p>章节依次解锁，完成练习后进入下一节。</p>
          </div>
          <div className="course-chapter-grid">
            {detail.chapters.map((chapter) => (
              <article key={chapter.key}>
                <span>第 {chapter.number} 章</span>
                <h3>{chapter.title}</h3>
                <ol>
                  {chapter.lessons.map((lesson) => (
                    <li key={lesson.key}>
                      <Check size={14} aria-hidden="true" />
                      <span>
                        {lesson.number}. {lesson.title}
                      </span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>
      </main>
    </CourseChrome>
  );
}
