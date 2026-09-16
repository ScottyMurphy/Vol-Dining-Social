#include <iostream>
#include <string>
#include <vector>

struct User {
    std::string email;
    std::string password;
};

bool isValidUTKEmail(const std::string& email) {
    const std::string domain = "@vols.utk.edu";

    if (email.length() <= domain.length()) {
        return false;
    }

    return email.substr(email.length() - domain.length()) == domain;
}

bool userExists(const std::vector<User>& users, const std::string& email) {
    for (const User& user : users) {
        if (user.email == email) {
            return true;
        }
    }

    return false;
}

void signUp(std::vector<User>& users) {
    std::string email;
    std::string password;

    std::cout << "\n--- Sign Up ---" << std::endl;

    std::cout << "UTK Email: ";
    std::cin >> email;

    if (!isValidUTKEmail(email)) {
        std::cout << "Sign up failed." << std::endl;
        std::cout << "You must use an @vols.utk.edu email address."
                  << std::endl;
        return;
    }

    if (userExists(users, email)) {
        std::cout << "An account with that email already exists."
                  << std::endl;
        return;
    }

    std::cout << "Create Password: ";
    std::cin >> password;

    if (password.empty()) {
        std::cout << "Password cannot be empty." << std::endl;
        return;
    }

    User newUser;
    newUser.email = email;
    newUser.password = password;

    users.push_back(newUser);

    std::cout << "Account created successfully!" << std::endl;
}

// CHANGED: login now returns a bool
bool login(const std::vector<User>& users) {
    std::string email;
    std::string password;

    std::cout << "\n--- Log In ---" << std::endl;

    std::cout << "UTK Email: ";
    std::cin >> email;

    if (!isValidUTKEmail(email)) {
        std::cout << "Login failed." << std::endl;
        std::cout << "You must use an @vols.utk.edu email address."
                  << std::endl;

        return false; // CHANGED
    }

    std::cout << "Password: ";
    std::cin >> password;

    for (const User& user : users) {
        if (user.email == email && user.password == password) {
            std::cout << "Login successful!" << std::endl;
            std::cout << "Welcome to Vol Dining Social."
                      << std::endl;

            return true; // CHANGED: successful login
        }
    }

    std::cout << "Invalid email or password." << std::endl;

    return false; // CHANGED
}

int main() {
    std::vector<User> users;

    int choice;

    do {
        std::cout << "\n============================" << std::endl;
        std::cout << "     Vol Dining Social" << std::endl;
        std::cout << "============================" << std::endl;

        std::cout << "1. Sign Up" << std::endl;
        std::cout << "2. Log In" << std::endl;
        std::cout << "3. Exit" << std::endl;

        std::cout << "Choose an option: ";
        std::cin >> choice;

        switch (choice) {
            case 1:
                signUp(users);
                break;

            case 2:
                // CHANGED: exit program after successful login
                if (login(users)) {
                    return 0;
                }
                break;

            case 3:
                std::cout << "Goodbye!" << std::endl;
                break;

            default:
                std::cout << "Invalid option." << std::endl;
        }

    } while (choice != 3);

    return 0;
}