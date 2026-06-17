import logo from '@/assets/logo.jpg';

/**
 * Header shown only when printing a report.
 * Hidden on screen, visible in @media print.
 */
const PrintHeader = ({ reportTitle, dateRange }) => (
  <div className="print-header">
    <div className="flex items-center justify-center gap-4 mb-2">
      <img src={logo} alt="GCC Logo" className="w-16 h-16 object-contain" />
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 leading-normal">
          Gospel Coalition Church
        </h1>
        <p className="text-[11px] text-gray-400 italic mt-0.5">"Sharing Christ, Changing Lives"</p>
        <p className="text-xs text-gray-500 mt-0.5">San Pablo City, Laguna, Philippines</p>
      </div>
      <img src={logo} alt="" className="w-16 h-16 object-contain opacity-0" aria-hidden />
    </div>

    <div className="border-t-2 border-primary-600 pt-2 mb-4 text-center">
      <h2 className="text-lg font-bold text-primary-700">{reportTitle}</h2>
      {dateRange && (
        <p className="text-xs text-gray-500 mt-0.5">{dateRange}</p>
      )}
    </div>
  </div>
);

export default PrintHeader;
