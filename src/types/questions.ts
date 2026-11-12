export type QuizMode = "learning" | "exam" | "weak" | "scenario";
export type Difficulty = "easy" | "medium" | "hard";
export type Confidence = "guess" | "somewhat" | "certain";
export interface Option { id: string; text: string; explanation?: string; }
export interface Item { id: string; text: string; }
export interface BaseQuestion {
  id: string; domain: "concepts" | "foundry"; topic: string; subtopic: string;
  questionType: string; presentation: string; difficulty: Difficulty; question: string;
  explanation: string; learningObjective: string; tags: string[]; sourceUrls: string[]; code?: string;
  optionExplanations?: Record<string,string>;
}
export interface SingleChoiceQuestion extends BaseQuestion { questionType: "single_choice"; options: Option[]; correctAnswer: string[]; }
export interface MultipleChoiceQuestion extends BaseQuestion { questionType: "multiple_choice"; options: Option[]; correctAnswer: string[]; }
export interface CodeAnalysisQuestion extends BaseQuestion { questionType: "code_analysis"; options: Option[]; correctAnswer: string[]; }
export type ChoiceQuestion = SingleChoiceQuestion | MultipleChoiceQuestion | CodeAnalysisQuestion;
export interface MatchingQuestion extends BaseQuestion { questionType: "matching"; items: Item[]; targets: Item[]; correctAnswer: Record<string,string>; }
export interface YesNoMatrixQuestion extends BaseQuestion { questionType: "yes_no_matrix"; items: Item[]; targets: Item[]; correctAnswer: Record<string,string>; }
export interface OrderingQuestion extends BaseQuestion { questionType: "ordering"; items: Item[]; correctAnswer: string[]; }
export type Question = ChoiceQuestion | MatchingQuestion | YesNoMatrixQuestion | OrderingQuestion;
export type MatchingAnswer = Record<string,string>;
export type QuestionAnswer = string[] | MatchingAnswer;
export type Answers = Record<string, QuestionAnswer>;
export type ConfidenceAnswers = Record<string, Confidence>;
export interface AttemptRecord { questionId: string; objective: string; correct: boolean; confidence?: Confidence; timestamp: string; }
