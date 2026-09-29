import { useLayoutEffect, useRef } from "react";

interface TextResponseProps {
  value: string;
  onChange: (value: string) => void;
  labelledBy: string;
  placeholder?: string;
  length?: "short" | "long";
}

export function TextResponse({
  value,
  onChange,
  labelledBy,
  placeholder,
  length = "long",
}: TextResponseProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [value, length]);

  return (
    <textarea
      ref={ref}
      className={length === "short" ? "text-response is-short" : "text-response is-long"}
      value={value}
      placeholder={placeholder}
      aria-labelledby={labelledBy}
      rows={length === "short" ? 1 : 4}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
