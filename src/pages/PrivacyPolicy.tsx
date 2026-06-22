import LegalDocumentLayout from '../components/LegalDocumentLayout'
import { getPrivacyPolicyDocument } from '../data/legalPolicies'

const PrivacyPolicy = () => {
  return <LegalDocumentLayout document={getPrivacyPolicyDocument()} />
}

export default PrivacyPolicy
