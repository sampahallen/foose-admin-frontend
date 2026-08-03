import { Icon } from '../icons/Icon'
import { buttonClass } from '../ui/buttonStyles'

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="mx-auto my-10 flex max-w-xl flex-col items-center gap-4 rounded-xl border border-foose-danger-bg bg-foose-surface p-8 text-center">
      <Icon name="alert" size={32} />
      <h2 className="text-lg font-bold text-foose-text">Unable to load this view</h2>
      <p className="text-sm leading-6 text-foose-muted">{message}</p>
      {retry && (
        <button className={buttonClass({ variant: 'secondary' })} onClick={retry} type="button">
          Retry
        </button>
      )}
    </div>
  )
}
