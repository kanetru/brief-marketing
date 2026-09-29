import type { ReactNode } from "react";

interface QuestionScreenProps {
  kicker?: string;
  title: ReactNode;
  prompt?: string;
  supporting?: string;
  size?: "hero" | "question";
  children?: ReactNode;
}

export function QuestionScreen({
  kicker,
  title,
  prompt,
  supporting,
  size = "question",
  children,
}: QuestionScreenProps) {
  return (
    <article className={size === "hero" ? "question is-hero" : "question"}>
      {kicker ? <p className="kicker">{kicker}</p> : null}
      <h1 id="question-title" className="display">
        {title}
      </h1>
      {prompt ? (
        <h2 id="question-prompt" className="prompt">
          {prompt}
        </h2>
      ) : null}
      {supporting ? (
        <p id="question-support" className="supporting">
          {supporting}
        </p>
      ) : null}
      {children ? <div className="answer">{children}</div> : null}
    </article>
  );
}
