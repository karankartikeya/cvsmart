export default function StepSection({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <span className="step-badge">{number}</span>
        <h3 className="text-[20px] font-semibold text-black">{title}</h3>
      </div>
      {description && (
        <p className="mt-1 ml-[56px] text-sm text-stone">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </div>
  );
}
