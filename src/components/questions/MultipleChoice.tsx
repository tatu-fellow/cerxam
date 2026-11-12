import type { MultipleChoiceQuestion } from "../../types/questions";

interface MultipleChoiceProps {
  question: MultipleChoiceQuestion;
  value: string[];
  onChange: (value: string[]) => void;
}

export default function MultipleChoice({
  question,
  value,
  onChange,
}: MultipleChoiceProps) {
  const toggleOption = (optionId: string) => {
    if (value.includes(optionId)) {
      onChange(
        value.filter((id) => id !== optionId)
      );

      return;
    }

    onChange([
      ...value,
      optionId,
    ]);
  };

  return (
    <div className="space-y-3">
      {question.options.map((option) => {
        const selected = value.includes(option.id);

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => toggleOption(option.id)}
            className={`w-full rounded-2xl border p-4 text-left transition ${
              selected
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