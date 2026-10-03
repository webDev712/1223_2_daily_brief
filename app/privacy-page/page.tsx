'use client';

import { PrivacyPageTopicInterface } from "@/lib/types";
import './page.css';

function PrivacyPageTopic (topic_data: PrivacyPageTopicInterface) {
    return (
        <div className="topic" >
            <h1>{topic_data.header}</h1>
            <p>{topic_data.description}</p>
        </div>
    )
}

export default function PrivacyPage () {
    return (
        <div className="privacy-page">
            <div>
                <div onClick={() => {history.back()}}>{`< Back`}</div>
                <div>Privacy Policy of <strong>Daily Brief</strong></div>
            </div>
            <div className="topics">
                {PrivacyPageTopics.map((topic: PrivacyPageTopicInterface, id: number) => (
                    <PrivacyPageTopic header={topic.header} description={topic.description} id={id} key={`privacy_page_topic_${id}`}></PrivacyPageTopic>
                ))}
            </div>
        </div>
    )
}

const PrivacyPageTopics: PrivacyPageTopicInterface[] = [
    {
        header: "1. Introduction",
        description:
            "Daily Brief is a workforce management platform designed to help businesses manage employees, departments, daily reports, tasks, and operational activities. This Privacy Policy explains how we collect, use, store, and protect personal information when you use our website and services.",
    },
    {
        header: "2. Information We Collect",
        description:
            "We may collect personal and business-related information, including names, email addresses, employee details, department assignments, daily reports, task records, and other information provided by users or their organizations. We also collect authentication data necessary to provide secure access to the platform.",
    },
    {
        header: "3. Google Authentication",
        description:
            "Daily Brief uses Google Authentication to provide secure user login. When you sign in with Google, we receive certain information from your Google account, such as your name, email address, and profile information, as permitted by your account settings. We use this information exclusively for authentication, account management, and providing access to the platform.",
    },
    {
        header: "4. How We Use Your Information",
        description:
            "We use collected information to operate and maintain Daily Brief, manage user accounts and permissions, generate daily reports, organize departments, track tasks and operational activities, provide customer support, improve platform functionality, and maintain the security and reliability of our services.",
    },
    {
        header: "5. Employee and Company Data",
        description:
            "Daily Brief allows authorized company representatives to manage employee information, assign users to departments, create and review reports, and track operational tasks. Company administrators and users with appropriate permissions may access information related to their organization. Access to data is determined by the permissions and roles configured by the company.",
    },
    {
        header: "6. Data Storage and Security",
        description:
            "We use third-party infrastructure providers to host and store information necessary for the operation of Daily Brief. We implement reasonable technical and organizational measures designed to protect personal information against unauthorized access, alteration, disclosure, or destruction. However, no online service or electronic storage system can be guaranteed to be completely secure.",
    },
    {
        header: "7. Data Sharing",
        description:
            "We do not sell or rent personal information to third parties. Information may be shared with infrastructure and service providers when necessary to operate Daily Brief, provide authentication, maintain the platform, or comply with legal obligations. We may also disclose information when required by law or when necessary to protect the rights, security, and integrity of our services.",
    },
    {
        header: "8. Data Retention",
        description:
            "We retain personal information for as long as necessary to provide our services, maintain business records, comply with applicable legal obligations, and resolve disputes. The retention of employee records and operational data may also depend on the policies and requirements of the organization using Daily Brief.",
    },
    {
        header: "9. User Rights and Data Control",
        description:
            "Users may request access to, correction of, or deletion of their personal information, subject to applicable laws and legitimate business requirements. Users should contact their company's administrator regarding employee records and organizational data. For questions or requests concerning information processed directly by Daily Brief, users may contact us using the contact information provided on our website.",
    },
    {
        header: "10. Cookies and Technical Information",
        description:
            "Daily Brief may use cookies and similar technologies required for authentication, session management, security, and essential website functionality. We may also collect technical information, such as browser type, device information, and basic usage data, to maintain and improve the platform.",
    },
    {
        header: "11. Third-Party Services",
        description:
            "Daily Brief relies on third-party services to provide certain features, including authentication, database hosting, and application hosting. These providers may process information on our behalf in accordance with their respective privacy policies and applicable data protection requirements.",
    },
    {
        header: "12. Children's Privacy",
        description:
            "Daily Brief is a business-oriented platform and is not intended for children under the age of 16. We do not knowingly collect personal information from children without an appropriate legal basis or authorization. If we become aware that such information has been collected unlawfully, we will take reasonable steps to address it.",
    },
    {
        header: "13. Changes to This Privacy Policy",
        description:
            "We may update this Privacy Policy from time to time to reflect changes in our services, business practices, or applicable legal requirements. Any updates will be published on this page, together with the revised effective date. Continued use of Daily Brief after changes are published constitutes use under the updated policy.",
    },
    {
        header: "14. Contact Information",
        description:
            "If you have any questions, concerns, or requests regarding this Privacy Policy or the processing of your personal information, please contact the Daily Brief team through the contact details provided on our website.",
    },
    {
        header: "15. System Owners' Access to Data",
        description:
            "The owners and administrators of Daily Brief have full access to the information stored and processed within the system, including user accounts, employee information, daily reports, department data, tasks, and other operational records. This access is necessary for system administration, maintenance, troubleshooting, security, and service improvement. System owners may access this information regardless of individual user roles or permissions.",
    },
    {
        header: "16. Access to User Communications",
        description:
            "To ensure effective team collaboration, maintain operational transparency, and support proper management, users with manager-level permissions may have access to messages exchanged between other users within the system. This access is intended for legitimate business purposes, including team coordination, supervision, troubleshooting, and maintaining appropriate communication within the organization. Users should be aware that messages sent through Daily Brief may be visible to authorized managers, regardless of whether they are the intended recipients.",
    },
    {
        header: "17. Third-Party Services and Data Storage",
        description:
            "Daily Brief is integrated with third-party services and infrastructure providers, including Vercel and Neon, which are used for application hosting and database storage. Information processed through Daily Brief may be stored or transferred using these third-party platforms. Each provider operates under its own terms of service, privacy policy, and security practices. Daily Brief and its owners are not responsible for the independent data storage, security, availability, or data handling practices of these third-party providers. Users acknowledge that the use of such services is subject to the respective providers' terms and policies.",
    },
];
