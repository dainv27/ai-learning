package com.phase0demo.approve.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // Disable CSRF for API endpoints; enable in production with proper token handling
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/api/approvals/**").authenticated()
                .anyRequest().permitAll()
            )
            .httpBasic(basic -> {});

        return http.build();
    }

    @Bean
    public UserDetailsService userDetailsService() {
        // In-memory users for development and testing
        // Production: integrate with identity provider (OAuth2, LDAP, etc.)
        UserDetails admin = User.builder()
            .username("admin")
            .password(passwordEncoder().encode("admin-password"))
            .roles("APPROVER", "ADMIN")
            .build();

        UserDetails user1 = User.builder()
            .username("user1")
            .password(passwordEncoder().encode("user1-password"))
            .roles("APPROVER")
            .build();

        return new InMemoryUserDetailsManager(admin, user1);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}