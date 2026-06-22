import LegalDocumentLayout from '../components/LegalDocumentLayout'
import { getCancellationPolicyDocument } from '../data/legalPolicies'

const CancellationPolicy = () => {
  return <LegalDocumentLayout document={getCancellationPolicyDocument()} />
}

export default CancellationPolicy
