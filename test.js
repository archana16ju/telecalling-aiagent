
async function testAI() {
    try {
        const response = await fetch('http://localhost:3000/call', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: "Hello AI"
            })
        });

        const data = await response.json();
        console.log("AI Response:", data);

    } catch (error) {
        console.error("Error:", error.message);
    }
}

testAI();