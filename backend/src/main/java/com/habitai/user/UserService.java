package com.habitai.user;

import com.habitai.common.security.CurrentUser;
import com.habitai.exception.UserNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final CurrentUser currentUser;

    public UserService(UserRepository userRepository, CurrentUser currentUser) {
        this.userRepository = userRepository;
        this.currentUser = currentUser;
    }

    public UserDTO getUserDetails() {
        long id = currentUser.getId();
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            throw new UserNotFoundException("User not found");
        }
        return new UserDTO(user.getEmail());
    }

}
