import type { CodeAnalysisQuestion, SingleChoiceQuestion } from "../../types/questions";

interface SingleChoiceProps {
  question: SingleChoiceQuestion | CodeAnalysisQuestion;
  value: string[];
  onChange: (value: string[]) => void;
}

export default function SingleChoice({
  question,
  value,
  onChange,
}: SingleChoiceProps) {
  return (
    <div className="space-y-3">
      {question.options.map((option) => {
        const selected = value.includes(option.id);

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange([option.id])}
            className={`w-full rounded-2xl border p-4 text-left transition ${selected
                ? "border-cyan-400 bg-cyan-400/10"
                : "border-slate-700 bg-slate-900 hover:border-slate-500"
              }`}
          >
            <span className="mr-3 font-semibold">
              {option.id}.
            </span>

            {option.text}
          </button>
        );
      })}
    </div>
  );
}