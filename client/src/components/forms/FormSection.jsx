const FormSection = ({ title, description, children }) => {
  return (
    <section className="card">
      <header className="mb-4 pb-3 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-primary-700">{title}</h3>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </section>
  );
};

export default FormSection;
