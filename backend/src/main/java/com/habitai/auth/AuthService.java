package com.habitai.auth;

import com.habitai.exception.PasswordDoesNotMatchException;
import com.habitai.exception.UserAlreadyExistException;
import com.habitai.exception.UserNotFoundException;
import com.habitai.user.User;
import com.habitai.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public RegisterResponse register(AuthRequest authRequest){
        if(userRepository.findByEmail(authRequest.email()).isPresent()){
            throw new UserAlreadyExistException("User Already Exists!");
        }

        User user = new User();
        user.setEmail(authRequest.email());
        user.setPassword(passwordEncoder.encode(authRequest.password()));
        userRepository.save(user);

        return new RegisterResponse("User Successfully created!");
    }

    public LoginResponse login(AuthRequest authRequest) {
        User user = userRepository.findByEmail(authRequest.email()).orElseThrow(() -> new UserNotFoundException("User Not Found!"));

        if(!passwordEncoder.matches(authRequest.password(), user.getPassword())){
            throw new PasswordDoesNotMatchException("Invalid credentials!");
        }

        String jwtToken = jwtService.generateToken(user);
        return new LoginResponse(jwtToken);
    }
}
