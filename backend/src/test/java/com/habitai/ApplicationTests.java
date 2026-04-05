package com.habitai;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(properties = {
		"GROK_API_KEY=test",
		"JWT_SECRET=test-jwt-secret-key-for-integration-tests-min-32-chars"
})
@ActiveProfiles("test")
class ApplicationTests {

	@Test
	void contextLoads() {
	}

}
