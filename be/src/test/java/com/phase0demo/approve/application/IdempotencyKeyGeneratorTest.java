package com.phase0demo.approve.application;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class IdempotencyKeyGeneratorTest {

    @Test
    void generateIdempotencyKey_producesUniqueKeys() {
        IdempotencyKeyGenerator generator = new IdempotencyKeyGenerator();
        Set<String> keys = new HashSet<>();
        
        for (int i = 0; i < 1000; i++) {
            String key = generator.generateIdempotencyKey();
            assertNotNull(key);
            assertFalse(key.isEmpty());
            assertTrue(key.startsWith("idem-"));
            assertTrue(keys.add(key), "Duplicate key generated: " + key);
        }
        
        assertEquals(1000, keys.size());
    }

    @Test
    void generateIdempotencyKey_hasCorrectFormat() {
        IdempotencyKeyGenerator generator = new IdempotencyKeyGenerator();
        String key = generator.generateIdempotencyKey();
        
        assertNotNull(key);
        assertTrue(key.matches("idem-\\d+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"));
    }

    @Test
    void generateIdempotencyKey_subsequentCallsProduceDifferentKeys() {
        IdempotencyKeyGenerator generator = new IdempotencyKeyGenerator();
        
        String key1 = generator.generateIdempotencyKey();
        String key2 = generator.generateIdempotencyKey();
        String key3 = generator.generateIdempotencyKey();
        
        assertNotEquals(key1, key2);
        assertNotEquals(key2, key3);
        assertNotEquals(key1, key3);
    }
}
