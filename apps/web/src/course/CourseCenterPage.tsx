import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpenCheck, Clock3, Layers3 } from "lucide-react";
import { courseApi } from "../lib/course-api";
import { CourseChrome, CoursePageState } from "./CourseChrome";

export default function CourseCenterPage() {
  const courses = useQuery({
    queryKey: ["courses"],
    queryFn: courseApi.list,
  });

  if (courses.isPending) {
    return (
      <CourseChrome>
        <CoursePageState
          title="正在整理学习路线"
          detail="课程大纲和你的学习进度马上就好。"
        />
      </CourseChrome>
    );
  }

  if (courses.isError || !courses.data?.[0]) {
    return (
      <CourseChrome>
        <CoursePageState
          title="学习中心暂时没有打开"
          detail="请稍后刷新页面。如果问题持续出现，可以向系统管理员反馈。"
          action={
            <button
              className="course-button course-button-primary"
              type="button"
              onClick={() => void courses.refetch()}
            >
              重新读取
            </button>
          }
        />
      </CourseChrome>
    );
  }

  const course = courses.data[0];
  const enrollment = course.enrollment;
  const actionLabel = enrollment
    ? enrollment.status === "COMPLETED"
      ? "回看课程"
      : "继续学习"
    : "查看课程";
  const actionHref = enrollment?.continueHref ?? "/courses/geo-foundations";

  return (
    <CourseChrome>
      <main className="course-center">
        <section
          className="course-center-hero"
          aria-labelledby="course-center-title"
        >
          <span className="course-kicker">OROSAGA LEARNING</span>
          <h1 id="course-center-title">学习中心</h1>
          <p>
            欢迎回来。这里把移山科技的业务逻辑、工作方法和真实决策场景，整理成可以逐步完成的课程。
          </p>
        </section>

        <section
          className="course-library"
          aria-labelledby="course-library-title"
        >
          <div className="course-section-heading">
            <div>
              <span>当前课程</span>
              <h2 id="course-library-title">从一门完整课程开始</h2>
            </div>
            <p>建议按顺序学习，每节约 8 至 12 分钟。</p>
          </div>

          <article className="course-library-card">
            <div className="course-card-visual" aria-hidden="true">
              <div className="course-card-orbit course-card-orbit-one" />
              <div className="course-card-orbit course-card-orbit-two" />
              <span>GEO</span>
            </div>
            <div className="course-card-content">
              <div className="course-card-badges">
                <span className="course-badge course-badge-blue">全员开放</span>
                <span className="course-badge">循序解锁</span>
              </div>
              <p className="course-card-eyebrow">{course.shortTitle}</p>
              <h2>{course.title}</h2>
              <p>{course.description}</p>
              <ul className="course-card-meta" aria-label="课程信息">
                <li>
                  <Layers3 size={17} aria-hidden="true" />
                  {course.lessonCount} 个小节
                </li>
                <li>
                  <Clock3 size={17} aria-hidden="true" />约{" "}
                  {Math.round(course.estimatedMinutes / 60)} 小时
                </li>
                <li>
                  <BookOpenCheck size={17} aria-hidden="true" />
                  场景、模型与练习
                </li>
              </ul>

              {enrollment && (
                <div className="course-progress-block">
                  <div>
                    <span>学习进度</span>
                    <strong>{enrollment.progressPercent}%</strong>
                  </div>
                  <div
                    className="course-progress-track"
                    role="progressbar"
                    aria-label="课程学习进度"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={enrollment.progressPercent}
                  >
                    <i style={{ width: `${enrollment.progressPercent}%` }} />
                  </div>
                  <small>
                    已完成 {enrollment.completedLessons} / {course.lessonCount}{" "}
                    节
                  </small>
                </div>
              )}

              <a
                className="course-button course-button-primary"
                href={actionHref}
              >
                {actionLabel}
                <ArrowRight size={17} aria-hidden="true" />
              </a>
            </div>
          </article>
        </section>
      </main>
    </CourseChrome>
  );
}
