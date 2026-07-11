ALTER TABLE "webhook_configs"
ADD COLUMN "event_types" TEXT[] NOT NULL DEFAULT ARRAY[
  'RequirementCreated',
  'RequirementUpdated',
  'RequirementStatusChanged',
  'RequirementDeleted',
  'DefectCreated',
  'DefectUpdated',
  'DefectStatusChanged',
  'DefectCommentCreated',
  'DefectReplyCreated',
  'DefectDeleted',
  'TestCaseCreated',
  'TestCaseUpdated',
  'TestCaseExecuted',
  'TestCaseDeleted'
]::TEXT[];
