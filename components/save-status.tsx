interface SaveStatusProps {
  isSaving: boolean
}

export default function SaveStatus({ isSaving }: SaveStatusProps) {
  if (!isSaving) return null

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-md shadow-md px-3 py-2 flex items-center z-50">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
      <span className="text-sm text-gray-600">Saving to database...</span>
    </div>
  )
}
