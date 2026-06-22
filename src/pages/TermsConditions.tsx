import LegalDocumentLayout from '../components/LegalDocumentLayout'
import { getTermsConditionsDocument } from '../data/legalPolicies'
import { useResortContact } from '../contexts/SiteSettingsProvider'

const TermsConditions = () => {
  const resortContact = useResortContact()
  return <LegalDocumentLayout document={getTermsConditionsDocument(resortContact)} />
}

export default TermsConditions
