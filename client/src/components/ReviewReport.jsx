function Section({ title, items, color, icon }) {
  if (!items || items.length === 0) return null;
  return (
    <div className={`rounded-lg border p-4 ${color}`}>
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm">
            {typeof item === 'string' ? (
              <span>{item}</span>
            ) : (
              <div>
                <p>{item.issue}</p>
                {item.file && (
                  <p className="mt-1 font-mono text-xs opacity-70">
                    {item.file}{item.line ? `:${item.line}` : ''}
                  </p>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ReviewReport({ review, prTitle }) {
  return (
    <div className="mt-6 space-y-4">
      <div className="border-b pb-4">
        <h2 className="text-lg font-semibold text-gray-800">{prTitle}</h2>
        <p className="text-sm text-gray-600 mt-1">{review.summary}</p>
      </div>

      <Section
        title="Architectural Conflicts"
        items={review.architectural_conflicts}
        color="bg-orange-50 border-orange-200 text-orange-900"
        icon="🏗️"
      />
      <Section
        title="Bugs"
        items={review.bugs}
        color="bg-red-50 border-red-200 text-red-900"
        icon="🐛"
      />
      <Section
        title="Security Issues"
        items={review.security}
        color="bg-purple-50 border-purple-200 text-purple-900"
        icon="🔐"
      />
      <Section
        title="Code Smell"
        items={review.code_smell}
        color="bg-yellow-50 border-yellow-200 text-yellow-900"
        icon="🧹"
      />
      <Section
        title="Positives"
        items={review.positive}
        color="bg-green-50 border-green-200 text-green-900"
        icon="✅"
      />

      {review.suggested_action && (
        <div className="rounded-lg border bg-blue-50 border-blue-200 text-blue-900 p-4">
          <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
            <span>💬</span> Suggested Action
          </h3>
          <p className="text-sm">{review.suggested_action}</p>
        </div>
      )}
    </div>
  );
}
