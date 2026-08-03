import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookMarked, Clock3, ShieldCheck } from "lucide-react";
import { courseApi } from "../lib/course-api";
import { CourseChrome, CoursePageState } from "./CourseChrome";

export default function CourseCertificatePage() {
  const course = useQuery({
    queryKey: ["course", "geo-foundations"],
    queryFn: courseApi.detail,
  });
  const enrollmentId = course.data?.enrollment?.id;
  const completion = useQuery({
    queryKey: ["course-certificate", enrollmentId],
    queryFn: () => courseApi.certificate(enrollmentId!),
    enabled: Boolean(enrollmentId),
  });

  if (course.isPending || (enrollmentId && completion.isPending)) {
    return (
      <CourseChrome
        backHref="/courses/geo-foundations/completion"
        backLabel="返回结业页"
      >
        <CoursePageState title="正在核对凭证规则" detail="请稍候。" />
      </CourseChrome>
    );
  }

  if (
    !course.data?.enrollment ||
    !completion.data ||
    course.isError ||
    completion.isError
  ) {
    return (
      <CourseChrome backHref="/courses" backLabel="返回学习中心">
        <CoursePageState
          title="暂时没有课程凭证"
          detail="进入课程后可以查看对应版本的结业规则。"
        />
      </CourseChrome>
    );
  }

  return (
    <CourseChrome
      backHref="/courses/geo-foundations/completion"
      backLabel="返回结业页"
    >
      <main className="course-certificate-page">
        <section className="course-certificate-sheet">
          <div className="course-certificate-mark" aria-hidden="true">
            <BookMarked size={34} />
          </div>
          <span className="course-card-eyebrow">PILOT LEARNING RECORD</span>
          <h1>GEO 实战训练营 · 试学记录</h1>
          <p className="course-certificate-lead">
            当前版本用于课程内容和学习体验验证，系统已保存你的学习进度与完成状态。
          </p>
          <div className="course-certificate-rule">
            <ShieldCheck size={22} aria-hidden="true" />
            <div>
              <strong>当前不签发正式证书</strong>
              <p>{completion.data.certificate.reason}</p>
            </div>
          </div>
          <dl>
            <div>
              <dt>课程版本</dt>
              <dd>{course.data.version}</dd>
            </div>
            <div>
              <dt>完成进度</dt>
              <dd>
                {completion.data.completedLessons} /{" "}
                {completion.data.lessonCount} 节
              </dd>
            </div>
            <div>
              <dt>学习状态</dt>
              <dd>{completion.data.completed ? "已完成" : "学习中"}</dd>
            </div>
            <div>
              <dt>记录方式</dt>
              <dd>账户内长期保存</dd>
            </div>
          </dl>
          <div className="course-certificate-next">
            <Clock3 size={18} aria-hidden="true" />
            <p>正式课程发布后，证书规则会随 RELEASE 版本单独公布。</p>
          </div>
          <a
            className="course-button course-button-secondary"
            href="/courses/geo-foundations/completion"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            返回结业页
          </a>
        </section>
      </main>
    </CourseChrome>
  );
}
