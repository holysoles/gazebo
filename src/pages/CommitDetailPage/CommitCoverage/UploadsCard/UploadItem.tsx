import { useQueryClient as useQueryClientV5 } from '@tanstack/react-queryV5'
import without from 'lodash/without'
import { useEffect, useState } from 'react'

import { IgnoredIdsQueryOptions } from 'pages/CommitDetailPage/queries/IgnoredIdsQueryOptions'
import { UploadTypeEnum } from 'shared/utils/commit'
import { formatTimeToNow } from 'shared/utils/dates'
import { Upload } from 'shared/utils/extractUploads'
import A from 'ui/A'
import Checkbox from 'ui/Checkbox'
import Icon from 'ui/Icon'

import RenderError from './RenderError'
import UploadReference from './UploadReference'

interface UploadProps {
  upload: Upload
  isSelected?: boolean
  onSelectChange?: (isSelected: boolean) => void
}

const UploadItem = ({
  upload: {
    ciUrl,
    buildCode,
    createdAt,
    flags,
    downloadUrl,
    errors,
    uploadType,
    state,
    name,
    id,
  },
  isSelected,
  onSelectChange = () => {},
}: UploadProps) => {
  const [checked, setChecked] = useState(true)
  const queryClientV5 = useQueryClientV5()
  const isCarriedForward = uploadType === UploadTypeEnum.CARRIED_FORWARD

  useEffect(() => setChecked(isSelected ?? true), [isSelected])

  return (
    <div className="flex flex-col gap-1 border-r border-ds-gray-secondary px-4 py-2">
      <div className="flex justify-between ">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Checkbox
            checked={checked}
            data-marketing="toggle-upload-hit-count"
            onClick={() => {
              onSelectChange(!checked)
              setChecked(!checked)

              if (checked && id != null) {
                // User is unchecking
                queryClientV5.setQueryData(
                  IgnoredIdsQueryOptions().queryKey,
                  (oldData?: number[]) => [...(oldData ?? []), id]
                )
              } else if (id != null) {
                queryClientV5.setQueryData(
                  IgnoredIdsQueryOptions().queryKey,
                  (oldData?: number[]) => without(oldData, id)
                )
              }

              setChecked(!checked)
            }}
          />
          <UploadReference ciUrl={ciUrl} name={name} buildCode={buildCode} />
        </div>
        {createdAt && (
          <span className="text-xs text-ds-gray-quinary">
            {formatTimeToNow(createdAt)}
          </span>
        )}
      </div>
      <div className="flex justify-between pl-5">
        <div className="flex flex-col flex-wrap gap-2 md:flex-row">
          {flags
            ? flags.map((flag, i) => (
                <span key={`${flag}-${i}`} className="flex">
                  <Icon variant="solid" size="sm" name="flag" />
                  <span className="ml-1 text-xs">{flag}</span>
                </span>
              ))
            : null}
          {isCarriedForward && (
            <span className="text-xs text-ds-gray-quinary">carry-forward</span>
          )}
        </div>
        {/* @ts-expect-error - A hasn't been typed yet */}
        <A href={downloadUrl} hook="download report" download isExternal>
          Download
        </A>
      </div>
      <RenderError errors={errors} state={state} flags={flags} />
    </div>
  )
}

export default UploadItem
