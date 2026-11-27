import type { KycCorrectionField, KycRecord } from '../../types/api'

const correctionLabels: Record<KycCorrectionField, string> = {
  idNo: 'Document number',
  dob: 'Date of birth',
  phone: 'Phone number',
  idFront: 'ID front or passport photo page',
  idBack: 'Back of ID',
  selfie: 'Selfie',
  idDocument: 'Replace ID document',
}

const documentParts: KycCorrectionField[] = ['idNo', 'idFront', 'idBack']

export function KycCorrectionFields({ fields, idType, disabled, onChange }: {
  fields: KycCorrectionField[]
  idType: KycRecord['idType']
  disabled: boolean
  onChange: (fields: KycCorrectionField[]) => void
}) {
  return (
    <fieldset className="mb-4 min-w-0 space-y-1" disabled={disabled}>
      <legend className="mb-2 text-sm font-bold">What must the seller resubmit? (required)</legend>
      {(Object.keys(correctionLabels) as KycCorrectionField[]).filter((field) => field !== 'idBack' || idType !== 'Passport').map((field) => (
        <label className="flex min-h-11 items-center gap-2 text-sm" key={field}>
          <input
            checked={fields.includes(field)}
            disabled={fields.includes('idDocument') && documentParts.includes(field)}
            onChange={(event) => {
              const remaining = fields.filter((selected) => selected !== field && !(field === 'idDocument' && documentParts.includes(selected)))
              onChange(event.target.checked ? [...remaining, field] : remaining)
            }}
            type="checkbox"
          />
          {correctionLabels[field]}
        </label>
      ))}
    </fieldset>
  )
}

export function KycCorrectionSummary({ request }: { request: NonNullable<KycRecord['correctionRequest']> }) {
  return (
    <>
      <ul className="list-disc space-y-1 pl-5">
        {request.fields.map((field) => <li key={field}>{correctionLabels[field]}</li>)}
      </ul>
      {request.note && <p className="mt-3 whitespace-pre-wrap wrap-anywhere"><strong>Reviewer note</strong><br />{request.note}</p>}
    </>
  )
}
