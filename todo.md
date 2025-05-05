# HMS TypeScript Error Fixing - Session 3 Todo

Based on `tsc_errors_session3_updated.log` (after fixing immediate issues).

- [x] src/app/dashboard/patients/[id]/edit/page.tsx:129:18 - TS2322: Type 'string | number | boolean | null | undefined' is not assignable to type 'undefined'. Type 'null' is not assignable to type 'undefined'.
- [x] src/app/ipd/page.tsx:85:10 - TS2786: 'DischargeSummary' cannot be used as a JSX component.. Its type '({}: DischargeSummaryProperties) => void' is not a valid JSX element type.
- [x] src/app/pharmacy/page.tsx:36:19 - TS6133: 'setLoading' is declared but its value is never read.
- [x] src/components/er/er-patient-tracking-board.tsx:178:13 - TS2322: Type 'undefined' is not assignable to type 'string | null'. (assigned_physician)
- [x] src/components/er/er-patient-tracking-board.tsx:194:13 - TS2322: Type 'undefined' is not assignable to type 'string | null'. (assigned_physician)
- [x] src/components/er/er-patient-tracking-board.tsx:195:13 - TS2322: Type 'undefined' is not assignable to type 'string | null'. (assigned_nurse)
- [x] src/components/er/er-registration-modal.tsx:180:46 - TS2552: Cannot find name 'error'. Did you mean 'Error'?
- [x] src/components/ipd/ipd-pharmacy-integration.tsx:26:54 - TS2307: Cannot find module '@/types/ipd'.
- [x] src/components/ipd/ipd-pharmacy-integration.tsx:27:48 - TS2307: Cannot find module '@/types/pharmacy'.
- [x] src/components/ipd/ipd-pharmacy-integration.tsx:133:33 - TS18046: 'data' is of type 'unknown'.
- [ ] src/components/ipd/ipd-pharmacy-integration.tsx:138:26 - TS18046: 'data' is of type 'unknown'.
- [x] src/components/ipd/ipd-pharmacy-integration.tsx:205:25 - TS18046: 'errorData' is of type 'unknown'.
- [ ] src/components/ipd/nursing-notes.tsx:288:22 - TS2322: Type 'undefined' is not assignable to type 'T | null'.
- [ ] src/components/ipd/nursing-notes.tsx:293:7 - TS2322: Type 'undefined' is not assignable to type 'T | null'.
- [ ] src/components/ipd/vital-signs.tsx:208:9 - TS2322: Type 'number | undefined' is not assignable to type 'number | null'. (temperature)
- [ ] src/components/ipd/vital-signs.tsx:211:9 - TS2322: Type 'number | undefined' is not assignable to type 'number | null'. (pulse)
- [ ] src/components/ipd/vital-signs.tsx:212:9 - TS2322: Type 'number | undefined' is not assignable to type 'number | null'. (respiratory_rate)
- [ ] src/components/ipd/vital-signs.tsx:215:9 - TS2322: Type 'string | undefined' is not assignable to type 'string | null'. (blood_pressure)
- [ ] src/components/ipd/vital-signs.tsx:216:9 - TS2322: Type 'number | undefined' is not assignable to type 'number | null'. (oxygen_saturation)
- [ ] src/components/ipd/vital-signs.tsx:219:9 - TS2322: Type 'number | undefined' is not assignable to type 'number | null'. (pain_level)
- [ ] src/components/ipd/vital-signs.tsx:222:9 - TS2322: Type 'string | undefined' is not assignable to type 'string | null'. (notes)
- [ ] src/components/ipd/vital-signs.tsx:230:11 - TS18047: 'submissionData.pain_level' is possibly 'null'.
- [ ] src/components/ipd/vital-signs.tsx:231:11 - TS18047: 'submissionData.pain_level' is possibly 'null'.
- [ ] src/components/laboratory/order-management.tsx:90:5 - TS2322: Type 'undefined' is not assignable to type 'string | null'. (status)
- [ ] src/components/laboratory/order-management.tsx:91:5 - TS2322: Type 'undefined' is not assignable to type 'string | null'. (source)
- [ ] src/components/laboratory/order-management.tsx:92:5 - TS2322: Type 'undefined' is not assignable to type '[Dayjs, Dayjs] | null'. (dateRange)
- [ ] src/components/laboratory/order-management.tsx:152:7 - TS2304: Cannot find name 'setTests'.
- [ ] src/components/laboratory/order-management.tsx:293:7 - TS2322: Type 'undefined' is not assignable to type 'string | null'. (status)
- [ ] src/components/laboratory/order-management.tsx:294:7 - TS2322: Type 'undefined' is not assignable to type 'string | null'. (source)
- [ ] src/components/laboratory/order-management.tsx:295:7 - TS2322: Type 'undefined' is not assignable to type '[Dayjs, Dayjs] | null'. (dateRange)
- [ ] src/components/laboratory/result-management.tsx:300:10 - TS2304: Cannot find name 'selectedOrderItem'.
- [ ] src/components/laboratory/result-management.tsx:308:26 - TS2304: Cannot find name 'selectedOrderItem'.
- [ ] src/components/laboratory/result-management.tsx:623:36 - TS2304: Cannot find name 'selectedOrderItem'.
- [ ] src/components/laboratory/result-management.tsx:640:12 - TS2304: Cannot find name 'parameters'.
- [ ] src/components/laboratory/result-management.tsx:647:18 - TS2304: Cannot find name 'parameters'.
- [ ] src/components/laboratory/result-management.tsx:647:34 - TS7006: Parameter 'p' implicitly has an 'any' type.
- [ ] src/components/laboratory/sample-management.tsx:224:5 - TS6133: 'sample' is declared but its value is never read.
- [ ] src/components/opd/opd-patient-queue.tsx:121:7 - TS2304: Cannot find name 'setLoadingPermissions'.
- [ ] src/components/opd/opd-patient-queue.tsx:131:9 - TS2304: Cannot find name 'setLoadingPermissions'.
- [ ] src/components/ot/ot-booking-modal.tsx:160:9 - TS2322: Type 'string | undefined' is not assignable to type 'string | null'. (scheduled_start_time)
- [ ] src/components/ot/ot-booking-modal.tsx:163:9 - TS2322: Type 'string | undefined' is not assignable to type 'string | null'. (scheduled_end_time)
- [ ] src/components/ot/ot-dashboard-stats.tsx:57:61 - TS2552: Cannot find name 'error'. Did you mean 'Error'?

