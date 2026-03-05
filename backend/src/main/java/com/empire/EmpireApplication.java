package com.empire;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EmpireApplication {
    public static void main(String[] args) {
        SpringApplication.run(EmpireApplication.class, args);
    }
}
