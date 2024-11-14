# Frontend:
    They chose React to power the front end, capitalizing on its component-based architecture and virtual DOM to create a responsive, interactive interface that mimicked the look and feel of Microsoft Teams. Material UI was implemented to add a sleek and professional design aesthetic, similar to Teams, while maintaining a custom branding approach that made the app feel unique.

# Backend: 
    The backend was developed with Node.js, allowing for real-time communication and smooth API handling. Using Express as a server framework, they enabled fast responses to client requests and organized the codebase efficiently. JWT-based authentication was integrated to keep user sessions secure, with custom role-based access for enhanced security.

# Database: 
    MongoDB was chosen as the database, allowing storage of user details, chat history, and files exchanged between users in a flexible, document-oriented format. The dynamic schema of MongoDB was particularly advantageous for managing chat-specific data, such as unread message counts and user preferences, which could evolve over time without requiring a rigid schema.

# Real-Time Updates: 
    To ensure real-time chat functionality, WebSockets were implemented for instant message delivery, presence updates, and notification badges, closely mirroring Microsoft Teams’ quick response features. Additionally, push notifications kept users engaged and informed even when they weren’t actively on the app.

# Extra Features and Customizations: 
    Taking inspiration from Teams, the project included additional features like multi-threaded conversations, file sharing, and integration with calendars for scheduled meetings and reminders. The interface also displayed user statuses (online, away, offline) and supported group chats, enhancing the app's utility for team-based communication.

# Deployment and Scalability: 
    With the front end deployed on Netlify and the backend on Heroku, the team ensured easy, scalable access for users from any device.
