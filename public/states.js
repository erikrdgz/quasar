// 2026 state individual income tax for a single filer, from the Tax Foundation's
// "State Individual Income Tax Rates and Brackets, 2026" (data as of Feb 11, 2026):
// https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
//
// Each state: brackets as [threshold, rate] (rate applies to taxable income above
// the threshold; income below the first threshold is untaxed), the single standard
// deduction and personal exemption, and any of those the state gives as a credit.
// This is an estimate: local income taxes, deductions for federal tax paid,
// deduction phase-outs, recapture and other credits are not modelled.
export const STATES = [
  ['AL', 'Alabama', {brackets: [[0, .02], [500, .04], [3000, .05]], std: 3000, exemption: 1500, stdPhase: true}],
  ['AK', 'Alaska', null],
  ['AZ', 'Arizona', {brackets: [[0, .025]], std: 8350}],
  ['AR', 'Arkansas', {brackets: [[0, .02], [4600, .039]], std: 2470, credit: 29,
    // Incomes of $92,300 or less use a separate, lower table.
    lower: {limit: 92300, brackets: [[5500, .02], [10900, .03], [15600, .034], [25700, .039]]}}],
  ['CA', 'California', {brackets: [[0, .01], [11079, .02], [26264, .04], [41452, .06], [57542, .08], [72724, .093], [371479, .103], [445771, .113], [742953, .123], [1000000, .133]], std: 5540, credit: 153}],
  ['CO', 'Colorado', {brackets: [[0, .044]], std: 16100}],
  ['CT', 'Connecticut', {brackets: [[0, .02], [10000, .045], [50000, .055], [100000, .06], [200000, .065], [250000, .069], [500000, .0699]], exemption: 15000}],
  ['DE', 'Delaware', {brackets: [[2000, .022], [5000, .039], [10000, .048], [20000, .052], [25000, .0555], [60000, .066]], std: 3250, credit: 110}],
  ['DC', 'District of Columbia', {brackets: [[0, .04], [10000, .06], [40000, .065], [60000, .085], [250000, .0925], [500000, .0975], [1000000, .1075]], std: 16100}],
  ['FL', 'Florida', null],
  ['GA', 'Georgia', {brackets: [[0, .0519]], std: 12000}],
  ['HI', 'Hawaii', {brackets: [[0, .014], [9600, .032], [14400, .055], [19200, .064], [24000, .068], [36000, .072], [48000, .076], [125000, .079], [175000, .0825], [225000, .09], [275000, .1], [325000, .11]], std: 4400, exemption: 1144}],
  ['ID', 'Idaho', {brackets: [[4811, .053]], std: 16100}],
  ['IL', 'Illinois', {brackets: [[0, .0495]], exemption: 2925}],
  ['IN', 'Indiana', {brackets: [[0, .0295]], exemption: 1000}],
  ['IA', 'Iowa', {brackets: [[0, .038]], std: 16100, credit: 40}],
  ['KS', 'Kansas', {brackets: [[0, .052], [23000, .0558]], std: 3605, exemption: 9160}],
  ['KY', 'Kentucky', {brackets: [[0, .035]], std: 3360}],
  ['LA', 'Louisiana', {brackets: [[0, .03]], std: 12875}],
  ['ME', 'Maine', {brackets: [[0, .058], [27399, .0675], [64849, .0715]], std: 8350, exemption: 5300}],
  ['MD', 'Maryland', {brackets: [[0, .02], [1000, .03], [2000, .04], [3000, .0475], [100000, .05], [125000, .0525], [150000, .055], [250000, .0575], [500000, .0625], [1000000, .065]], std: 3350, exemption: 3200}],
  ['MA', 'Massachusetts', {brackets: [[0, .05], [1083150, .09]], exemption: 4400}],
  ['MI', 'Michigan', {brackets: [[0, .0425]], exemption: 5900}],
  ['MN', 'Minnesota', {brackets: [[0, .0535], [33310, .068], [109430, .0785], [203150, .0985]], std: 15300}],
  ['MS', 'Mississippi', {brackets: [[10000, .04]], std: 2300, exemption: 6000}],
  ['MO', 'Missouri', {brackets: [[1348, .02], [2696, .025], [4044, .03], [5392, .035], [6740, .04], [8088, .045], [9436, .047]], std: 16100}],
  ['MT', 'Montana', {brackets: [[0, .047], [47500, .0565]], std: 16100}],
  ['NE', 'Nebraska', {brackets: [[0, .0246], [4130, .0351], [24760, .0455]], std: 8850, credit: 176}],
  ['NV', 'Nevada', null],
  ['NH', 'New Hampshire', null],
  ['NJ', 'New Jersey', {brackets: [[0, .014], [20000, .0175], [35000, .035], [40000, .0553], [75000, .0637], [500000, .0897], [1000000, .1075]], exemption: 1000}],
  ['NM', 'New Mexico', {brackets: [[0, .015], [5500, .032], [16500, .043], [33500, .047], [66500, .049], [210000, .059]], std: 16100}],
  ['NY', 'New York', {brackets: [[0, .039], [8500, .044], [11700, .0515], [13900, .054], [80650, .059], [215400, .0685], [1077550, .0965], [5000000, .103], [25000000, .109]], std: 8000}],
  ['NC', 'North Carolina', {brackets: [[0, .0399]], std: 12750}],
  ['ND', 'North Dakota', {brackets: [[48475, .0195], [244825, .025]], std: 16100}],
  ['OH', 'Ohio', {brackets: [[26050, .0275]], exemption: 2400}],
  ['OK', 'Oklahoma', {brackets: [[3750, .025], [4900, .035], [7200, .045]], std: 6350, exemption: 1000}],
  ['OR', 'Oregon', {brackets: [[0, .0475], [4550, .0675], [11400, .0875], [125000, .099]], std: 2910, credit: 256}],
  ['PA', 'Pennsylvania', {brackets: [[0, .0307]]}],
  ['RI', 'Rhode Island', {brackets: [[0, .0375], [82050, .0475], [186450, .0599]], std: 11200, exemption: 5250}],
  ['SC', 'South Carolina', {brackets: [[3640, .03], [18230, .06]], std: 8350}],
  ['SD', 'South Dakota', null],
  ['TN', 'Tennessee', null],
  ['TX', 'Texas', null],
  ['UT', 'Utah', {brackets: [[0, .045]]}],
  ['VT', 'Vermont', {brackets: [[0, .0335], [49400, .066], [119700, .076], [249700, .0875]], std: 7650, exemption: 5300}],
  ['VA', 'Virginia', {brackets: [[0, .02], [3000, .03], [5000, .05], [17000, .0575]], std: 8750, exemption: 930}],
  ['WA', 'Washington', null],
  ['WV', 'West Virginia', {brackets: [[0, .0222], [10000, .0296], [25000, .0333], [40000, .0444], [60000, .0482]], exemption: 2000}],
  ['WI', 'Wisconsin', {brackets: [[0, .035], [15110, .044], [51950, .053], [332720, .0765]], std: 13960, exemption: 700}],
  ['WY', 'Wyoming', null],
];

export const DEFAULT_STATE = 'CO';
export const stateName = code => STATES.find(([c]) => c === code)?.[1] || 'Colorado';
export const isState = code => STATES.some(([c]) => c === code);
export const hasIncomeTax = code => !!STATES.find(([c]) => c === code)?.[2];

function progressive(taxable, brackets) {
  let tax = 0;
  brackets.forEach(([from, rate], i) => {
    const to = brackets[i + 1]?.[0] ?? Infinity;
    tax += Math.max(0, Math.min(taxable, to) - from) * rate;
  });
  return tax;
}

// Alabama: $3,000 standard deduction up to $25,499 of income, $25 less per extra $500, floor $2,500.
const alabamaStd = income => income <= 25499 ? 3000 : Math.max(2500, 3000 - 25 * Math.ceil((income - 25499) / 500));

export function stateTax(income, code = DEFAULT_STATE) {
  const s = STATES.find(([c]) => c === code)?.[2];
  if (!s || income <= 0) return 0;
  const std = s.stdPhase ? alabamaStd(income) : s.std || 0;
  const taxable = Math.max(0, income - std - (s.exemption || 0));
  const brackets = s.lower && income <= s.lower.limit ? s.lower.brackets : s.brackets;
  return Math.max(0, progressive(taxable, brackets) - (s.credit || 0));
}
